import { deleteConversation } from '@/services/conversations.service';
import { getSupabaseClient } from '@/template';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

describe('Conversations Service - deleteConversation', () => {
  const mockRpc = jest.fn();
  const mockFrom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue({
      rpc: mockRpc,
      from: mockFrom,
    });
  });

  it('calls delete_conversation_command RPC and returns true on success', async () => {
    mockRpc.mockResolvedValueOnce({
      data: true,
      error: null,
    });

    const res = await deleteConversation('conv-123');
    expect(mockRpc).toHaveBeenCalledWith('delete_conversation_command', {
      p_conversation_id: 'conv-123',
    });
    expect(res.data).toBe(true);
    expect(res.error).toBeNull();
  });

  it('returns RPC error directly without direct delete fallback (BN-25)', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'function not found' },
    });

    const res = await deleteConversation('conv-123');
    // BN-25: No direct delete fallback — RPC-only path enforces RLS
    expect(mockFrom).not.toHaveBeenCalledWith('conversations');
    expect(res.data).toBeNull();
    expect(res.error).toBe('function not found');
  });

  it('returns RPC error message when deletion is not allowed', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Chats can only be deleted after the delivery is completed' },
    });

    const res = await deleteConversation('conv-123');
    expect(res.data).toBeNull();
    expect(res.error).toBe('Chats can only be deleted after the delivery is completed');
  });
});
