import {
  submitSandboxKyc,
  generateAadhaarOtp,
  verifyAadhaarOtp,
  verifyTransactionPan,
  checkUserPanStatus,
} from '@/services/kyc.service';
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('@/services/storage.service', () => ({
  uploadKycDocument: jest.fn(),
}));

jest.mock('@/lib/server-rate-limit', () => ({
  enforceRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

describe('KYC Sandbox Submission Service', () => {
  const mockRpc = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: mockRpc,
    });
  });

  it('submits sandbox KYC with face verification metrics successfully', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await submitSandboxKyc('session-123', 'user-456', {
      isValid: true,
      confidence: 94,
      faceCount: 1,
      isCentered: true,
      lightingQuality: 'good',
    });

    expect(mockRpc).toHaveBeenCalledWith('submit_sandbox_kyc', {
      p_session_id: 'session-123',
      p_user_id: 'user-456',
      p_face_verified: true,
      p_face_confidence: 94,
      p_face_metrics: {
        faceCount: 1,
        isCentered: true,
        lightingQuality: 'good',
      },
    });

    expect(result.data).toEqual({ success: true });
    expect(result.error).toBeNull();
  });

  it('handles submission when face metrics are omitted', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await submitSandboxKyc('session-123', 'user-456');

    expect(mockRpc).toHaveBeenCalledWith('submit_sandbox_kyc', {
      p_session_id: 'session-123',
      p_user_id: 'user-456',
      p_face_verified: true,
      p_face_confidence: null,
      p_face_metrics: null,
    });

    expect(result.data).toEqual({ success: true });
    expect(result.error).toBeNull();
  });

  it('returns an error when RPC fails', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Session not in pending status or missing selfie' },
    });

    const result = await submitSandboxKyc('session-123', 'user-456', {
      isValid: true,
      confidence: 88,
      faceCount: 1,
      isCentered: true,
      lightingQuality: 'good',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe('Session not in pending status or missing selfie');
  });

  it('handles Aadhaar OTP generation when gateway returns message without reference_id', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });

    // Mock global.fetch to return Sandbox response without reference_id (e.g. OTP already dispatched)
    const originalFetch = global.fetch;
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'test_token' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 200,
          data: { message: 'OTP already generated and valid for 10 minutes.' },
        }),
      } as Response);

    const result = await generateAadhaarOtp('user-123', 'John Doe', '123456789012');

    expect(result.data).toBeNull();
    expect(result.error).toContain('OTP already generated and valid for 10 minutes.');

    global.fetch = originalFetch;
  });

  it('detects expired OTP message in verifyAadhaarOtp', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 200,
          data: { message: 'OTP expired' },
        }),
      } as Response);

    const result = await verifyAadhaarOtp('sess-1', 'user-1', 'live_ref_123', '123456');

    expect(result.data).toBeNull();
    expect(result.error).toBe('Your OTP has expired. Please request a new OTP to continue.');

    global.fetch = originalFetch;
  });

  describe('Transaction PAN Verification', () => {
    it('rejects invalid PAN format', async () => {
      const result = await verifyTransactionPan('user-1', 'INVALID123');
      expect(result.data).toBeNull();
      expect(result.error).toContain('valid 10-character PAN');
    });

    it('detects duplicate PAN across other users', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'other-user', pan_hash: 'hash-abc' },
          error: null,
        }),
      });

      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      const result = await verifyTransactionPan('user-1', 'ABCDE1234F');
      expect(result.data).toBeNull();
      expect(result.error).toContain('already linked to another CarryGo account');
    });

    it('verifies PAN successfully via verify_user_pan RPC', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      const mockRpcVerify = jest.fn().mockResolvedValue({
        data: { success: true, pan_masked: 'ABCDE••••F' },
        error: null,
      });

      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: mockFrom,
        rpc: mockRpcVerify,
      });

      const result = await verifyTransactionPan('user-1', 'ABCDE1234F');
      expect(result.error).toBeNull();
      expect(result.data?.verified).toBe(true);
      expect(result.data?.panMasked).toBe('ABCDE••••F');
    });

    it('checks PAN status from database when not cached', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { pan_verification_status: 'verified', pan_reference_id: 'pan_tx_123' },
          error: null,
        }),
      });

      (getSupabaseClient as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      const status = await checkUserPanStatus('user-fresh-999');
      expect(status.isVerified).toBe(true);
    });
  });
});

