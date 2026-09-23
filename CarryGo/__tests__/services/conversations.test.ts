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

  it('falls back to direct table deletion if RPC fails', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'function not found' },
    });

    const mockEq = jest.fn().mockResolvedValueOnce({
      error: null,
    });
    const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });

    const res = await deleteConversation('conv-123');
    expect(mockFrom).toHaveBeenCalledWith('conversations');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'conv-123');
    expect(res.data).toBe(true);
    expect(res.error).toBeNull();
  });

  it('returns error message if both RPC and fallback deletion fail', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Chats can only be deleted after the delivery is completed' },
    });

    const mockEq = jest.fn().mockResolvedValueOnce({
      error: { message: 'RLS violation' },
    });
    const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });

    const res = await deleteConversation('conv-123');
    expect(res.data).toBeNull();
    expect(res.error).toBe('Chats can only be deleted after the delivery is completed');
  });
});
