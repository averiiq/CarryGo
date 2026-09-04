import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { getSupabaseClient } from '@/template';
import {
  createConversation,
  fetchConversations,
  fetchMessagesPage,
  markMessagesRead,
  sendMessage,
} from '@/services/conversations.service';
import { InfiniteData } from '@tanstack/react-query';
import { ChatMessage, Conversation } from '@/types';

function serviceError(message: string | null | undefined, fallback: string) {
  return new Error(message || fallback);
}

interface RealtimeConversationRow {
  id: string;
  request_id: string;
  participant_ids?: string[];
  participant_names?: Record<string, string>;
  route?: string;
  parcel_description?: string;
  last_message_text?: string;
  last_message_sender_id?: string;
  last_message_at?: string;
  last_message_read?: boolean;
  created_at: string;
}

interface RealtimeMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
  read: boolean;
}

function mapRealtimeConversation(row: RealtimeConversationRow): Conversation {
  return {
    id: row.id,
    requestId: row.request_id,
    participants: row.participant_ids || [],
    participantNames: row.participant_names || {},
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

function mapRealtimeMessage(row: RealtimeMessageRow): ChatMessage {
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

type ChatMessagesPage = {
  items: ChatMessage[];
  nextCursor: string | null;
};

let realtimeChannelInstance = 0;

function appendRealtimeMessage(
  current: InfiniteData<ChatMessagesPage, string | null> | undefined,
  message: ChatMessage
): InfiniteData<ChatMessagesPage, string | null> | undefined {
  if (!current || current.pages.length === 0) return current;
  const allItems = current.pages.flatMap(page => page.items);
  if (allItems.some(item => item.id === message.id)) return current;
  const lastPage = current.pages[current.pages.length - 1];
  return {
    ...current,
    pages: [
      ...current.pages.slice(0, -1),
      {
        ...lastPage,
        items: [...lastPage.items, message].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      },
    ],
  };
}

function updateRealtimeMessage(
  current: InfiniteData<ChatMessagesPage, string | null> | undefined,
  message: ChatMessage
): InfiniteData<ChatMessagesPage, string | null> | undefined {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map(page => ({
      ...page,
      items: page.items.map(item => item.id === message.id ? message : item),
    })),
  };
}

export function useConversationsQuery(userId?: string) {
  return useQuery<Conversation[]>({
    queryKey: queryKeys.conversations.byUser(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    staleTime: 2 * 60_000,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchConversations(userId);
      if (error) throw serviceError(error, 'Failed to load conversations');
      return data ?? [];
    },
  });
}

export function useConversationsRealtime(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    const sb = getSupabaseClient();

    const channelInstance = ++realtimeChannelInstance;
    const convChannel = sb
      .channel(`conversations:${userId}:${channelInstance}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, payload => {
        const row = (payload.new || payload.old) as any;
        const participants = row?.participant_ids;
        if (Array.isArray(participants) && participants.includes(userId)) {
          queryClient.setQueryData<Conversation[]>(queryKeys.conversations.byUser(userId), current => {
            const existing = current ?? [];
            const mapped = mapRealtimeConversation(row);
            const others = existing.filter(conversation => conversation.id !== mapped.id);
            return [mapped, ...others].sort((a, b) =>
              (b.lastMessage?.timestamp || b.id).localeCompare(a.lastMessage?.timestamp || a.id)
            );
          });
        }
      })
      .subscribe((status) => {
        if (!mounted) {
          void sb.removeChannel(convChannel);
        }
      });

    const msgChannel = sb
      .channel(`conv-messages:${userId}:${channelInstance}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        const row = (payload.new || payload.old) as any;
        const conversationId = row?.conversation_id;
        if (!conversationId) return;
        const current = queryClient.getQueryData<Conversation[]>(queryKeys.conversations.byUser(userId)) ?? [];
        if (!current.some(conversation => conversation.id === conversationId)) return;
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byUser(userId) });
      })
      .subscribe((status) => {
        if (!mounted) {
          void sb.removeChannel(msgChannel);
        }
      });

    return () => {
      mounted = false;
      void sb.removeChannel(convChannel);
      void sb.removeChannel(msgChannel);
    };
  }, [queryClient, userId]);
}

export function useConversationMessagesQuery(conversationId?: string) {
  return useInfiniteQuery<ChatMessagesPage, Error, InfiniteData<ChatMessagesPage, string | null>, readonly unknown[], string | null>({
    queryKey: queryKeys.conversations.messages(conversationId ?? 'missing'),
    enabled: Boolean(conversationId),
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      if (!conversationId) return { items: [], nextCursor: null };
      const { data, error, hasMore } = await fetchMessagesPage(conversationId, {
        before: pageParam,
        limit: 40,
      });
      if (error) throw serviceError(error, 'Failed to load messages');
      const items = data ?? [];
      const oldest = items[0]?.timestamp ?? null;
      return {
        items,
        nextCursor: hasMore && oldest ? oldest : null,
      };
    },
    getNextPageParam: lastPage => lastPage.nextCursor,
  });
}

export function useConversationMessagesRealtime(conversationId?: string, userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    let mounted = true;
    const sb = getSupabaseClient();
    const channelInstance = ++realtimeChannelInstance;
    const channel = sb
      .channel(`messages:${conversationId}:${channelInstance}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        payload => {
          const message = mapRealtimeMessage(payload.new as unknown as RealtimeMessageRow);
          queryClient.setQueryData<InfiniteData<ChatMessagesPage, string | null> | undefined>(
            queryKeys.conversations.messages(conversationId),
            current => appendRealtimeMessage(current, message)
          );
          if (userId) queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byUser(userId) });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        payload => {
          const message = mapRealtimeMessage(payload.new as unknown as RealtimeMessageRow);
          queryClient.setQueryData<InfiniteData<ChatMessagesPage, string | null> | undefined>(
            queryKeys.conversations.messages(conversationId),
            current => updateRealtimeMessage(current, message)
          );
          if (userId) queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byUser(userId) });
        }
      )
      .subscribe((status) => {
        if (!mounted) {
          void sb.removeChannel(channel);
        }
      });

    return () => {
      mounted = false;
      void sb.removeChannel(channel);
    };
  }, [conversationId, queryClient, userId]);
}

export function useCreateConversationMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversation: {
      requestId: string;
      participantIds: string[];
      participantNames: { [k: string]: string };
      route: string;
      parcelDescription: string;
    }) => {
      const { data, error } = await createConversation(conversation);
      if (error || !data) throw serviceError(error, 'Failed to create conversation');
      return data;
    },
    onSuccess: created => {
      if (userId) {
        queryClient.setQueryData<Conversation[]>(queryKeys.conversations.byUser(userId), current => {
          const existing = current ?? [];
          return [created, ...existing.filter(conversation => conversation.id !== created.id)];
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

export function useSendMessageMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      conversationId: string;
      senderId: string;
      senderName: string;
      text: string;
    }) => {
      const { data, error } = await sendMessage(message);
      if (error || !data) throw serviceError(error, 'Failed to send message');
      return data;
    },
    onSuccess: sent => {
      queryClient.setQueryData<InfiniteData<ChatMessagesPage, string | null> | undefined>(
        queryKeys.conversations.messages(sent.conversationId),
        current => {
          if (!current) return current;
          const withoutDupes = current.pages.map(page => ({
            ...page,
            items: page.items.filter(message => message.id !== sent.id),
          }));
          return appendRealtimeMessage({ ...current, pages: withoutDupes }, sent);
        }
      );

      if (userId) {
        queryClient.setQueryData<Conversation[]>(queryKeys.conversations.byUser(userId), current => {
          return (current ?? []).map(conversation =>
            conversation.id === sent.conversationId
              ? { ...conversation, lastMessage: sent }
              : conversation
          );
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

export function useMarkMessagesReadMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!userId) throw serviceError(null, 'Missing user session');
      await markMessagesRead(conversationId, userId);
      return conversationId;
    },
    onSuccess: conversationId => {
      queryClient.setQueryData<InfiniteData<ChatMessagesPage, string | null> | undefined>(
        queryKeys.conversations.messages(conversationId),
        current => current
          ? {
              ...current,
              pages: current.pages.map(page => ({
                ...page,
                items: page.items.map(message => ({ ...message, read: true })),
              })),
            }
          : current
      );

      if (userId) {
        queryClient.setQueryData<Conversation[]>(queryKeys.conversations.byUser(userId), current => {
          return (current ?? []).map(conversation =>
            conversation.id === conversationId && conversation.lastMessage
              ? { ...conversation, lastMessage: { ...conversation.lastMessage, read: true } }
              : conversation
          );
        });
      }
    },
  });
}




