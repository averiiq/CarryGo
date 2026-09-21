import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/admin-guard', () => ({
  requireAdmin: vi.fn(),
  logAdminAction: vi.fn(),
}))

import { bulkApproveKycSessions } from '@/app/dashboard/kyc/actions'
import { requireAdmin, logAdminAction } from '@/utils/admin-guard'

const mockRequireAdmin = vi.mocked(requireAdmin)
const mockLogAdminAction = vi.mocked(logAdminAction)

describe('bulkApproveKycSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects empty session array', async () => {
    const result = await bulkApproveKycSessions([])
    expect(result).toEqual({ success: false, error: 'No sessions selected' })
  })

  it('rejects batch size greater than 100', async () => {
    const largeBatch = Array.from({ length: 101 }, () => '11111111-1111-4111-8111-111111111111')
    const result = await bulkApproveKycSessions(largeBatch)
    expect(result).toEqual({ success: false, error: 'Maximum batch size is 100' })
  })

  it('rejects invalid UUIDs', async () => {
    const result = await bulkApproveKycSessions(['not-a-uuid'])
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Invalid session ID')
    }
  })

  it('returns auth error when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ error: 'Admin access required' })
    const validUuid = '11111111-1111-4111-8111-111111111111'
    const result = await bulkApproveKycSessions([validUuid])
    expect(result).toEqual({ success: false, error: 'Admin access required' })
  })

  it('successfully approves eligible KYC sessions and logs audit event', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: 2, error: null })
    const mockIn = vi.fn().mockResolvedValue({
      data: [
        { id: '11111111-1111-4111-8111-111111111111', user_id: 'aaaa1111-1111-4111-8111-111111111111', status: 'submitted' },
        { id: '22222222-2222-4222-8222-222222222222', user_id: 'bbbb2222-2222-4222-8222-222222222222', status: 'submitted' },
      ],
      error: null,
    })
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    mockRequireAdmin.mockResolvedValue({
      userId: 'admin-uuid-1',
      supabase: {
        from: mockFrom,
        rpc: mockRpc,
      } as never,
    })

    const result = await bulkApproveKycSessions([
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ])

    expect(result).toEqual({ success: true, approvedCount: 2 })
    expect(mockRpc).toHaveBeenCalledWith('cms_bulk_approve_kyc', {
      p_actor_id: 'admin-uuid-1',
      p_user_ids: ['aaaa1111-1111-4111-8111-111111111111', 'bbbb2222-2222-4222-8222-222222222222'],
    })
    expect(mockLogAdminAction).toHaveBeenCalled()
  })
})
