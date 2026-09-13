import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import {
  checkDuplicateRequest,
  createRequest,
  fetchRequestById,
  fetchRequests,
  fetchRequestsByParcelId,
  fetchRequestsByTripId,
  updateRequestStatus,
} from '@/services/requests.service';
import { Request } from '@/types';

function serviceError(message: string | null | undefined, fallback: string) {
  return new Error(message || fallback);
}

/**
 * Returns true if an active (pending/accepted) request already exists
 * for the given parcel+trip pair. Use this to disable the Carry button in the UI.
 */
export function useCheckDuplicateRequestQuery(parcelId?: string, tripId?: string) {
  return useQuery<boolean>({
    queryKey: ['requests', 'duplicate-check', parcelId ?? '', tripId ?? ''],
    enabled: Boolean(parcelId) && Boolean(tripId),
    staleTime: 30_000,
    retry: 0,
    queryFn: async () => {
      if (!parcelId || !tripId) return false;
      return checkDuplicateRequest(parcelId, tripId);
    },
  });
}

export function useRequestsQuery(userId?: string) {
  return useQuery<Request[]>({
    queryKey: queryKeys.requests.byUser(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    staleTime: 60_000,
    retry: 1,
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
    staleTime: 2 * 60_000,
    retry: 1,
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
    staleTime: 60_000,
    retry: 1,
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
    staleTime: 60_000,
    retry: 1,
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
      if (!userId) throw new Error('User session required');
      const { data, error } = await createRequest(request, userId);
      if (error || !data) throw serviceError(error, 'Failed to create request');
      return data;
    },
    onSuccess: created => {
      if (userId) {
        queryClient.setQueryData<Request[]>(queryKeys.requests.byUser(userId), current => {
          const existing = current ?? [];
          return [created, ...existing.filter(r => r.id !== created.id)];
        });
      }
      queryClient.setQueryData<Request | null>(queryKeys.requests.detail(created.id), created);
      // Targeted: only invalidate directly related lists
      if (created.parcelId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.requests.byParcel(created.parcelId) });
      }
      if (created.tripId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.requests.byTrip(created.tripId) });
      }
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
      if (!userId) throw new Error('User session required');
      const { data, error } = await updateRequestStatus(requestId, status, userId);
      if (error || !data) throw serviceError(error, 'Failed to update request');
      return data;
    },
    onSuccess: updated => {
      // Update detail cache in-place
      queryClient.setQueryData<Request | null>(queryKeys.requests.detail(updated.id), updated);
      // Update user list in-place — no network call needed
      if (userId) {
        queryClient.setQueryData<Request[]>(queryKeys.requests.byUser(userId), current =>
          (current ?? []).map(r => r.id === updated.id ? updated : r)
        );
      }
      // Targeted: only invalidate affected trip/parcel caches
      if (updated.tripId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.requests.byTrip(updated.tripId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.listings.trip(updated.tripId) });
      }
      if (updated.parcelId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.requests.byParcel(updated.parcelId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.listings.parcel(updated.parcelId) });
      }
    },
  });
}
