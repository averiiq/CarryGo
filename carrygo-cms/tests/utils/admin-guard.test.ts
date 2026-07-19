import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase client modules before importing the module under test
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { requireAdmin } from '@/utils/admin-guard';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const mockCreateClient = vi.mocked(createClient);
const mockCreateAdminClient = vi.mocked(createAdminClient);

function createMockAuthClient(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
      }),
    },
  };
}

function createMockAdminClient(profileData: Record<string, unknown> | null) {
  const singleMock = vi.fn().mockResolvedValue({ data: profileData });
  const eqMock = vi.fn().mockReturnValue({ single: singleMock });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
  const fromMock = vi.fn().mockReturnValue({ select: selectMock });

  return { from: fromMock };
}

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when user is not authenticated', async () => {
    const mockAuth = createMockAuthClient(null);
    mockCreateClient.mockResolvedValue(mockAuth as never);

    const result = await requireAdmin();

    expect(result).toEqual({ error: 'Authentication required' });
  });

  it('returns error when user has no admin role', async () => {
    const mockAuth = createMockAuthClient({ id: 'user-123' });
    mockCreateClient.mockResolvedValue(mockAuth as never);

    const mockAdmin = createMockAdminClient({
      system_role: 'user',
      account_status: 'active',
    });
    mockCreateAdminClient.mockReturnValue(mockAdmin as never);

    const result = await requireAdmin();

    expect(result).toEqual({ error: 'Admin access required' });
  });

  it('returns error when user profile is not found', async () => {
    const mockAuth = createMockAuthClient({ id: 'user-456' });
    mockCreateClient.mockResolvedValue(mockAuth as never);

    const mockAdmin = createMockAdminClient(null);
    mockCreateAdminClient.mockReturnValue(mockAdmin as never);

    const result = await requireAdmin();

    expect(result).toEqual({ error: 'Admin access required' });
  });

  it('returns error when admin account is banned', async () => {
    const mockAuth = createMockAuthClient({ id: 'admin-789' });
    mockCreateClient.mockResolvedValue(mockAuth as never);

    const mockAdmin = createMockAdminClient({
      system_role: 'admin',
      account_status: 'banned',
    });
    mockCreateAdminClient.mockReturnValue(mockAdmin as never);

    const result = await requireAdmin();

    expect(result).toEqual({ error: 'Account is not active. Access denied.' });
  });

  it('returns error when admin account is suspended', async () => {
    const mockAuth = createMockAuthClient({ id: 'admin-101' });
    mockCreateClient.mockResolvedValue(mockAuth as never);

    const mockAdmin = createMockAdminClient({
      system_role: 'admin',
      account_status: 'suspended',
    });
    mockCreateAdminClient.mockReturnValue(mockAdmin as never);

    const result = await requireAdmin();

    expect(result).toEqual({ error: 'Account is not active. Access denied.' });
  });

  it('returns supabase client and userId for active admin', async () => {
    const mockAuth = createMockAuthClient({ id: 'admin-200' });
    mockCreateClient.mockResolvedValue(mockAuth as never);

    const mockAdmin = createMockAdminClient({
      system_role: 'admin',
      account_status: 'active',
    });
    mockCreateAdminClient.mockReturnValue(mockAdmin as never);

    const result = await requireAdmin();

    expect(result).not.toHaveProperty('error');
    expect(result).toHaveProperty('supabase');
    expect(result).toHaveProperty('userId', 'admin-200');
  });

  it('returns supabase client when account_status is null (legacy accounts)', async () => {
    const mockAuth = createMockAuthClient({ id: 'admin-300' });
    mockCreateClient.mockResolvedValue(mockAuth as never);

    const mockAdmin = createMockAdminClient({
      system_role: 'super_admin',
      account_status: null,
    });
    mockCreateAdminClient.mockReturnValue(mockAdmin as never);

    const result = await requireAdmin();

    expect(result).not.toHaveProperty('error');
    expect(result).toHaveProperty('supabase');
    expect(result).toHaveProperty('userId', 'admin-300');
  });
});
