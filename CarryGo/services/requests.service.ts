import { getSupabaseClient } from '@/template';
import { Request } from '@/types';
import { sanitizeTextInput } from '@/lib/sanitize';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { validateUUID, validateAmount, validateDescription } from '@/lib/validation';
import { isAwsBackendEnabled } from '@/lib/backend/provider';
import { awsApiRequest, AwsApiError } from '@/lib/aws/api';
import { fetchParcelById } from '@/services/parcels.service';
import { fetchTripById } from '@/services/trips.service';

interface RequestRow {
  id: string;
  parcel_id: string;
  trip_id: string;
  sender_id: string;
  sender_name: string;
  traveller_id: string;
  traveller_name: string;
  status: string;
  price: number | string;
  message?: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: RequestRow): Request {
  return {
    id: row.id,
    parcelId: row.parcel_id,
    tripId: row.trip_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    travellerId: row.traveller_id,
    travellerName: row.traveller_name,
    status: row.status as Request['status'],
    price: parseFloat(String(row.price)),
    message: row.message || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCity(value: string): string {
  return value.trim().toLowerCase();
}

export async function fetchRequests(userId: string, options?: { limit?: number; offset?: number }) {
  if (isAwsBackendEnabled()) {
    try {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;
      const query = new URLSearchParams({
        userId,
        limit: String(limit),
        offset: String(offset),
      });

      const response = await awsApiRequest<{ data: Request[]; total: number }>(`/requests?${query.toString()}`);
      return { data: response.data, error: null, total: response.total };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to fetch requests';
      return { data: null, error: message, total: 0 };
    }
  }

  const sb = getSupabaseClient();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const { data, error, count } = await sb
    .from('requests')
    .select('*', { count: 'exact' })
    .or(`sender_id.eq.${userId},traveller_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return { data: null, error: error.message, total: 0 };
  return { data: (data || []).map(mapRow), error: null, total: count ?? 0 };
}

export async function fetchRequestById(requestId: string) {
  if (isAwsBackendEnabled()) {
    try {
      const response = await awsApiRequest<{ data: Request }>(`/requests/${requestId}`);
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to fetch request';
      return { data: null, error: message };
    }
  }

  const sb = getSupabaseClient();
  const { data, error } = await sb.from('requests').select('*').eq('id', requestId).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data), error: null };
}

export async function createRequest(req: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>, actorUserId?: string) {
  if (actorUserId && actorUserId !== req.senderId) {
    return { data: null, error: 'Only the parcel sender can create a request.' };
  }

  if (req.senderId === req.travellerId) {
    return { data: null, error: 'Sender and traveller cannot be the same user.' };
  }

  const parcelValidation = validateUUID(req.parcelId);
  if (!parcelValidation.valid) {
    return { data: null, error: parcelValidation.error };
  }

  const tripValidation = validateUUID(req.tripId);
  if (!tripValidation.valid) {
    return { data: null, error: tripValidation.error };
  }

  const priceValidation = validateAmount(req.price, 1, 100_000);
  if (!priceValidation.valid) {
    return { data: null, error: priceValidation.error };
  }

  if (req.message) {
    const msgValidation = validateDescription(req.message, 500);
    if (!msgValidation.valid) {
      return { data: null, error: msgValidation.error };
    }
  }

  const message = req.message ? sanitizeTextInput(req.message, 500) : null;

  const [parcelRes, tripRes] = await Promise.all([
    fetchParcelById(req.parcelId),
    fetchTripById(req.tripId),
  ]);

  if (parcelRes.error) {
    return { data: null, error: parcelRes.error };
  }
  if (tripRes.error) {
    return { data: null, error: tripRes.error };
  }

  const parcel = parcelRes.data;
  const trip = tripRes.data;

  if (!parcel || !trip) {
    return { data: null, error: 'Could not verify parcel or trip details.' };
  }

  if (actorUserId && parcel.userId !== actorUserId) {
    return { data: null, error: 'Only the parcel owner can send request to a traveller.' };
  }

  if (req.senderId !== parcel.userId) {
    return { data: null, error: 'Request sender must be the parcel owner.' };
  }

  if (req.travellerId !== trip.userId) {
    return { data: null, error: 'Request traveller must be the trip owner.' };
  }

  if (parcel.status !== 'open') {
    return { data: null, error: 'Parcel is no longer available for requests.' };
  }

  if (trip.status !== 'active') {
    return { data: null, error: 'Trip is no longer active.' };
  }

  if (parcel.weight > trip.availableCapacity) {
    return { data: null, error: 'Trip does not have enough remaining capacity.' };
  }

  const sameRoute =
    normalizeCity(parcel.fromCity) === normalizeCity(trip.fromCity)
    && normalizeCity(parcel.toCity) === normalizeCity(trip.toCity);

  if (!sameRoute) {
    return { data: null, error: 'Parcel and trip routes must match exactly.' };
  }

  if (isAwsBackendEnabled()) {
    try {
      const payload = {
        ...req,
        senderId: parcel.userId,
        senderName: parcel.userName,
        travellerId: trip.userId,
        travellerName: trip.userName,
        status: 'pending' as const,
        message: message || undefined,
      };

      const response = await awsApiRequest<{ data: Request }>('/requests', {
        method: 'POST',
        body: payload,
      });
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to create request';
      return { data: null, error: message };
    }
  }

  const rateLimitUserId = actorUserId || req.senderId;
  const rateCheck = await enforceRateLimit(rateLimitUserId, 'create_request');
  if (!rateCheck.allowed) {
    return { data: null, error: rateCheck.error ?? 'Rate limit exceeded. Please try again later.' };
  }

  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc('create_request_command', {
    p_parcel_id: req.parcelId,
    p_trip_id: req.tripId,
    p_price: req.price,
    p_message: message || undefined,
  }).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data as unknown as RequestRow), error: null };
}

export async function fetchRequestsByTripId(tripId: string) {
  if (isAwsBackendEnabled()) {
    try {
      const response = await awsApiRequest<{ data: Request[] }>(`/requests/by-trip/${tripId}`);
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to fetch trip requests';
      return { data: null, error: message };
    }
  }

  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('requests')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(r => mapRow(r as unknown as RequestRow)), error: null };
}

export async function fetchRequestsByParcelId(parcelId: string) {
  if (isAwsBackendEnabled()) {
    try {
      const response = await awsApiRequest<{ data: Request[] }>(`/requests/by-parcel/${parcelId}`);
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to fetch parcel requests';
      return { data: null, error: message };
    }
  }

  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('requests')
    .select('*')
    .eq('parcel_id', parcelId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(r => mapRow(r as unknown as RequestRow)), error: null };
}

function validateStatusTransition(request: Request, status: Request['status'], actorUserId: string): string | null {
  if (status === 'accepted' || status === 'rejected') {
    if (request.status !== 'pending') {
      return `Only pending requests can be ${status}.`;
    }
    if (request.travellerId !== actorUserId) {
      return `Only the assigned traveller can ${status} this request.`;
    }
    return null;
  }

  if (status === 'cancelled') {
    if (request.status !== 'pending') {
      return 'Only pending requests can be cancelled.';
    }
    if (request.senderId !== actorUserId) {
      return 'Only the parcel sender can cancel this request.';
    }
    return null;
  }

  if (status === 'completed') {
    if (request.status !== 'accepted') {
      return 'Only accepted requests can be completed.';
    }
    if (request.travellerId !== actorUserId) {
      return 'Only the assigned traveller can complete this request.';
    }
    return null;
  }

  if (status === 'failed') {
    if (request.status !== 'accepted') {
      return 'Only accepted requests can be marked failed.';
    }
    if (request.senderId !== actorUserId && request.travellerId !== actorUserId) {
      return 'Only sender or traveller can mark this request as failed.';
    }
    return null;
  }

  return 'Unsupported request transition.';
}

export async function updateRequestStatus(requestId: string, status: Request['status'], userId: string) {
  const idValidation = validateUUID(requestId);
  if (!idValidation.valid) {
    return { data: null, error: idValidation.error };
  }

  const existingRequest = await fetchRequestById(requestId);
  if (existingRequest.error || !existingRequest.data) {
    return { data: null, error: existingRequest.error ?? 'Request not found.' };
  }

  if (existingRequest.data.senderId !== userId && existingRequest.data.travellerId !== userId) {
    return { data: null, error: 'Only the sender or assigned traveller can update this request.' };
  }
  const transitionError = validateStatusTransition(existingRequest.data, status, userId);
  if (transitionError) {
    return { data: null, error: transitionError };
  }

  if (isAwsBackendEnabled()) {
    try {
      const response = await awsApiRequest<{ data: Request }>(`/requests/${requestId}/status`, {
        method: 'PATCH',
        body: {
          status,
          userId,
        },
      });
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to update request status';
      return { data: null, error: message };
    }
  }

  const rateCheck = await enforceRateLimit(userId, 'create_request');
  if (!rateCheck.allowed) {
    return { data: null, error: rateCheck.error ?? 'Rate limit exceeded. Please try again later.' };
  }

  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc('transition_request_status', {
    p_request_id: requestId,
    p_next_status: status,
  }).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data as unknown as RequestRow), error: null };
}
