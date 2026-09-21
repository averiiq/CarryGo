import { submitSandboxKyc } from '@/services/kyc.service';
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
});
