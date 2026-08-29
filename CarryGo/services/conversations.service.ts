import { getSupabaseClient } from '@/template';
import { Conversation, ChatMessage } from '@/types';
import type { Database } from '@/types/database';
import { sanitizeMessageText } from '@/lib/sanitize';
import { enforceRateLimit } from '@/lib/server-rate-limit';

type ConversationRow = Database['public']['Tables']['conversations']['Row'];

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
  read: boolean;
}

function mapConvRow(row: ConversationRow): Conversation {
  return {
    id: row.id,
    requestId: row.request_id,
    participants: row.participant_ids || [],
    participantNames: (row.participant_names as Record<string, string>) || {},
    route: row.route || '',
    parcelDescription: row.parcel_description || '',
    lastMessage: row.last_message_text
      ? {
          id: 'last',
          conversationId: row.id,
          senderId: row.last_message_sender_id || '',
          senderName: '',
          text: row.last_message_text,
          timestamp: row.last_message_at || row.created_at,
          read: row.last_message_read ?? true,
        }
      : undefined,
  };
}

function mapMsgRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    text: row.text,
    timestamp: row.created_at,
    read: row.read,
  };
}

export async function fetchConversations(userId: string, options?: { limit?: number; offset?: number }) {
  const sb = getSupabaseClient();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const { data, error } = await sb
    .from('conversations')
    .select('*')
    .contains('participant_ids', [userId])
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(mapConvRow), error: null };
}

export async function fetchMessages(conversationId: string) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(mapMsgRow), error: null };
}

export async function fetchMessagesPage(
  conversationId: string,
  options?: { before?: string | null; limit?: number }
) {
  const sb = getSupabaseClient();
  let query = sb
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 40);

  if (options?.before) {
    query = query.lt('created_at', options.before);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message, hasMore: false };
  const items = (data || []).map(mapMsgRow).reverse();
  return { data: items, error: null, hasMore: (data || []).length >= (options?.limit ?? 40) };
}

export async function createConversation(conv: {
  requestId: string;
  participantIds: string[];
  participantNames: { [k: string]: string };
  route: string;
  parcelDescription: string;
}) {
  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc('create_conversation_for_request', {
    p_request_id: conv.requestId,
  });
  if (error) return { data: null, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ? mapConvRow(row as ConversationRow) : null, error: null };
}

export async function sendMessage(msg: {
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
}) {
  const rateCheck = await enforceRateLimit(msg.senderId, 'send_message');
  if (!rateCheck.allowed) {
    return { data: null, error: rateCheck.error ?? 'Rate limit exceeded. Please try again later.' };
  }

  const sanitizedText = sanitizeMessageText(msg.text);
  if (sanitizedText.length === 0) return { data: null, error: 'Message cannot be empty' };

  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc('send_chat_message_command', {
    p_conversation_id: msg.conversationId,
    p_text: sanitizedText,
  });
  if (error) return { data: null, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ? mapMsgRow(row) : null, error: null };
}

export async function markMessagesRead(conversationId: string, userId: string) {
  const sb = getSupabaseClient();

  const { data: { user } } = await sb.auth.getUser();
  if (!user || user.id !== userId) return;
  await sb.rpc('mark_conversation_read', { p_conversation_id: conversationId });
}
