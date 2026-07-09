import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import {
  createRequest,
  fetchRequestById,
  fetchRequests,
  fetchRequestsByParcelId,
  fetchRequestsByTripId,
  updateRequestStatus,
} from '@/services/requests.service';
import { Request } from '@/types';
import { enforceRateLimit } from '@/lib/server-rate-limit';

function serviceError(message: string | null | undefined, fallback: string) {
  return new Error(message || fallback);
}

export function useRequestsQuery(userId?: string) {
  return useQuery<Request[]>({
    queryKey: queryKeys.requests.byUser(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    staleTime: 2 * 60_000,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchRequests(userId);
      if (error) throw serviceError(error, 'Failed to load requests');
      return data ?? [];
    },
  });
}

export function useRequestQuery(requestId?: string) {
  return useQuery<Request | null>({
    queryKey: queryKeys.requests.detail(requestId ?? 'missing'),
    enabled: Boolean(requestId),
    queryFn: async () => {
      if (!requestId) return null;
      const { data, error } = await fetchRequestById(requestId);
      if (error) throw serviceError(error, 'Failed to load request');
      return data;
    },
  });
}

export function useRequestsByTripQuery(tripId?: string) {
  return useQuery<Request[]>({
    queryKey: queryKeys.requests.byTrip(tripId ?? 'missing'),
    enabled: Boolean(tripId),
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await fetchRequestsByTripId(tripId);
      if (error) throw serviceError(error, 'Failed to load trip requests');
      return data ?? [];
    },
  });
}

export function useRequestsByParcelQuery(parcelId?: string) {
  return useQuery<Request[]>({
    queryKey: queryKeys.requests.byParcel(parcelId ?? 'missing'),
    enabled: Boolean(parcelId),
    queryFn: async () => {
      if (!parcelId) return [];
      const { data, error } = await fetchRequestsByParcelId(parcelId);
      if (error) throw serviceError(error, 'Failed to load parcel requests');
      return data ?? [];
    },
  });
}

export function useCreateRequestMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>) => {
      const rateCheck = await enforceRateLimit(request.senderId, 'create_request');
      if (!rateCheck.allowed) throw new Error(rateCheck.error);
      const { data, error } = await createRequest(request);
      if (error || !data) throw serviceError(error, 'Failed to create request');
      return data;
    },
    onSuccess: created => {
      if (userId) {
        queryClient.setQueryData<Request[]>(queryKeys.requests.byUser(userId), current => {
          const existing = current ?? [];
          return [created, ...existing.filter(request => request.id !== created.id)];
        });
      }
      queryClient.setQueryData<Request | null>(queryKeys.requests.detail(created.id), created);
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

export function useUpdateRequestStatusMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: {
      requestId: string;
      status: Request['status'];
    }) => {
      const { data, error } = await updateRequestStatus(requestId, status);
      if (error || !data) throw serviceError(error, 'Failed to update request');
      return data;
    },
    onSuccess: updated => {
      if (userId) {
        queryClient.setQueryData<Request[]>(queryKeys.requests.byUser(userId), current => {
          return (current ?? []).map(request =>
            request.id === updated.id
              ? updated
              : request
          );
        });
      }
      queryClient.setQueryData<Request | null>(queryKeys.requests.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
    },
  });
}
