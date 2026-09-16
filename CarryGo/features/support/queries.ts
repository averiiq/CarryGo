import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { getSupabaseClient } from '@/template';
import {
  createSupportTicket,
  CreateSupportTicketParams,
  getUserSupportTickets,
  mapSupportTicketRow,
  SupportTicketRow,
} from '@/services/support.service';
import { SupportTicket } from '@/types';

function serviceError(message: string | null | undefined, fallback: string) {
  return new Error(message || fallback);
}

let supportChannelInstance = 0;

export function useSupportTicketsQuery(userId?: string) {
  return useQuery<SupportTicket[]>({
    queryKey: queryKeys.support.tickets(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    staleTime: 30_000,
    retry: 1,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await getUserSupportTickets(userId);
      if (error) throw serviceError(error, 'Failed to load support tickets');
      return data ?? [];
    },
  });
}

/**
 * Real-time subscription to ticket status updates (e.g. admin resolves or responds).
 * Includes mounted-flag guard to avoid leaks on screen unmount.
 */
export function useSupportTicketsRealtime(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    const sb = getSupabaseClient();
    const instance = ++supportChannelInstance;

    const channel = sb
      .channel(`support_tickets:${userId}:${instance}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!mounted) return;

          queryClient.setQueryData<SupportTicket[]>(
            queryKeys.support.tickets(userId),
            (current = []) => {
              if (payload.eventType === 'INSERT') {
                const newTicket = mapSupportTicketRow(payload.new as unknown as SupportTicketRow);
                if (current.some((t) => t.id === newTicket.id)) return current;
                return [newTicket, ...current];
              }

              if (payload.eventType === 'UPDATE') {
                const updatedTicket = mapSupportTicketRow(payload.new as unknown as SupportTicketRow);
                return current.map((t) => (t.id === updatedTicket.id ? updatedTicket : t));
              }

              if (payload.eventType === 'DELETE') {
                const oldId = (payload.old as { id?: string })?.id;
                return current.filter((t) => t.id !== oldId);
              }

              return current;
            }
          );
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      sb.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

export function useCreateSupportTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation<SupportTicket, Error, CreateSupportTicketParams>({
    mutationFn: async (params) => {
      const { data, error } = await createSupportTicket(params);
      if (error || !data) {
        throw serviceError(error, 'Failed to submit support ticket');
      }
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate tickets query for this user so the list immediately updates
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.tickets(variables.userId),
      });
    },
  });
}
