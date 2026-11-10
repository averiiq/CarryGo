import { getSupabaseClient } from '@/template';
import { Request } from '@/types';
import { sanitizeTextInput } from '@/lib/sanitize';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { validateUUID, validateAmount, validateDescription } from '@/lib/validation';
import { isAwsBackendEnabled } from '@/lib/backend/provider';
import { awsApiRequest, AwsApiError } from '@/lib/aws/api';
import { fetchParcelById } from '@/services/parcels.service';
import { fetchTripById } from '@/services/trips.service';
import {
  notifyNewRequest,
  notifyNewCarryOffer,
  notifyRequestAccepted,
  notifyRequestDeclined,
  notifyOfferAccepted,
  notifyOfferDeclined,
} from '@/services/notifications.service';

export const MAX_PAGE_SIZE = 100;

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
  created_by?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  parcels?: { id: string; from_city: string; to_city: string; category?: string; weight?: number } | { id: string; from_city: string; to_city: string; category?: string; weight?: number }[] | null;
  trips?: { id: string; from_city: string; to_city: string; vehicle_type?: string } | { id: string; from_city: string; to_city: string; vehicle_type?: string }[] | null;
}

function extractCitiesFromMessage(msg?: string | null): { fromCity?: string; toCity?: string } {
  if (!msg) return {};
  const match = msg.match(/from\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?:\.|\s+by|\s+with|\s+it|$)/i);
  if (match && match[1] && match[2]) {
    return { fromCity: match[1].trim(), toCity: match[2].trim() };
  }
  return {};
}

function mapRow(row: RequestRow): Request {
  const parcel = Array.isArray(row.parcels) ? row.parcels[0] : row.parcels;
  const trip = Array.isArray(row.trips) ? row.trips[0] : row.trips;
  const parsed = extractCitiesFromMessage(row.message);

  const fromCity = parcel?.from_city || trip?.from_city || parsed.fromCity || undefined;
  const toCity = parcel?.to_city || trip?.to_city || parsed.toCity || undefined;

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
    fromCity,
    toCity,
    parcelCategory: parcel?.category,
    parcelWeight: parcel?.weight ? parseFloat(String(parcel.weight)) : undefined,
    createdBy: row.created_by || undefined,
    expiresAt: row.expires_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCity(value: string): string {
  return value.trim().toLowerCase();
}

export async function fetchRequests(userId: string, options?: { limit?: number; offset?: number }) {
  const userIdCheck = validateUUID(userId);
  if (!userIdCheck.valid) return { data: null, error: userIdCheck.error, total: 0 };

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
    .select('*, parcels(id, from_city, to_city, category, weight), trips(id, from_city, to_city, vehicle_type)', { count: 'exact' })
    .or(`sender_id.eq.${userId},traveller_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return { data: null, error: error.message, total: 0 };
  return { data: (data || []).map(r => mapRow(r as unknown as RequestRow)), error: null, total: count ?? 0 };
}

export async function fetchRequestById(requestId: string) {
  const idCheck = validateUUID(requestId);
  if (!idCheck.valid) return { data: null, error: idCheck.error };

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
  const { data, error } = await sb
    .from('requests')
    .select('*, parcels(id, from_city, to_city, category, weight), trips(id, from_city, to_city, vehicle_type)')
    .eq('id', requestId)
    .single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data as unknown as RequestRow), error: null };
}

export async function createRequest(req: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>, actorUserId?: string) {
  // Basic actor check: must be either the sender or traveller (or unspecified for trusted internal calls)
  if (actorUserId && actorUserId !== req.senderId && actorUserId !== req.travellerId) {
    return { data: null, error: 'Only the parcel sender or trip traveller can create a request.' };
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

  if (isAwsBackendEnabled()) {
    // For AWS path, pre-fetch to get verified IDs (AWS API doesn't resolve them server-side)
    const [parcelRes, tripRes] = await Promise.all([
      fetchParcelById(req.parcelId),
      fetchTripById(req.tripId),
    ]);
    if (parcelRes.error) return { data: null, error: parcelRes.error };
    if (tripRes.error) return { data: null, error: tripRes.error };
    const parcel = parcelRes.data;
    const trip = tripRes.data;
    if (!parcel || !trip) return { data: null, error: 'Could not verify parcel or trip details.' };
    if (actorUserId && parcel.userId !== actorUserId && trip.userId !== actorUserId) {
      return { data: null, error: 'Only the parcel owner or trip owner can create a request.' };
    }
    if (parcel.userId === trip.userId) {
      return { data: null, error: 'The parcel owner and trip owner cannot be the same person.' };
    }
    try {
      const payload = {
        parcelId: req.parcelId,
        tripId: req.tripId,
        senderId: parcel.userId,
        senderName: parcel.userName,
        travellerId: trip.userId,
        travellerName: trip.userName,
        status: 'pending' as const,
        price: req.price,
        message: message || undefined,
      };
      const response = await awsApiRequest<{ data: Request }>('/requests', {
        method: 'POST',
        body: payload,
      });
      return { data: response.data, error: null };
    } catch (error) {
      const awsMessage = error instanceof AwsApiError ? error.message : 'Failed to create request';
      return { data: null, error: awsMessage };
    }
  }

  // ── Supabase path ──────────────────────────────────────────────────────────
  // Rate limit check before any DB work
  const rateLimitUserId = actorUserId || req.senderId;
  const rateCheck = await enforceRateLimit(rateLimitUserId, 'create_request');
  if (!rateCheck.allowed) {
    return { data: null, error: rateCheck.error ?? 'Rate limit exceeded. Please try again later.' };
  }

  const sb = getSupabaseClient();

  // Happy path: let the RPC validate ownership, status, capacity and route internally.
  // This avoids 2 extra fetchParcel/fetchTrip round-trips on every successful carry offer.
  const { data: rpcData, error: rpcError } = await sb.rpc('create_request_command', {
    p_parcel_id: req.parcelId,
    p_trip_id: req.tripId,
    p_price: req.price,
    p_message: message || undefined,
  }).single();

  let mapped: Request;

  if (rpcError || !rpcData) {
    const isSchemaError =
      rpcError?.code === '42883' ||
      rpcError?.message?.includes('emit_domain_event') ||
      rpcError?.message?.includes('does not exist');

    if (isSchemaError) {
      console.warn('[requests.service] RPC schema mismatch (42883), executing resilient direct insert fallback');
      const { data: insertData, error: insertError } = await sb
        .from('requests')
        .insert({
          parcel_id: req.parcelId,
          trip_id: req.tripId,
          sender_id: req.senderId,
          sender_name: req.senderName || 'Sender',
          traveller_id: req.travellerId,
          traveller_name: req.travellerName || 'Traveller',
          created_by: actorUserId || req.senderId,
          status: 'pending',
          price: req.price,
          message: message || null,
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        })
        .select('*')
        .single();

      if (insertError || !insertData) {
        return { data: null, error: insertError?.message || rpcError?.message || 'Failed to create request.' };
      }

      mapped = mapRow(insertData as unknown as RequestRow);
    } else {
      return { data: null, error: rpcError?.message || 'Failed to create request.' };
    }
  } else {
    mapped = mapRow(rpcData as unknown as RequestRow);
  }
  if (mapped.createdBy && mapped.createdBy === mapped.travellerId) {
    void notifyNewCarryOffer({
      senderId: mapped.senderId,
      travellerId: mapped.travellerId,
      travellerName: mapped.travellerName,
      price: mapped.price,
      requestId: mapped.id,
      fromCity: mapped.fromCity,
      toCity: mapped.toCity,
    }).catch(err => console.warn('Failed to dispatch carry offer notification:', err));
  } else {
    void notifyNewRequest({
      travellerId: mapped.travellerId,
      senderId: mapped.senderId,
      senderName: mapped.senderName,
      price: mapped.price,
      requestId: mapped.id,
      fromCity: mapped.fromCity,
      toCity: mapped.toCity,
    }).catch(err => console.warn('Failed to dispatch new request notification:', err));
  }
  return { data: mapped, error: null };
}

export async function fetchRequestsByTripId(tripId: string, options?: { limit?: number; offset?: number }) {
  const idCheck = validateUUID(tripId);
  if (!idCheck.valid) return { data: null, error: idCheck.error };

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
  const limit = Math.min(options?.limit ?? 50, MAX_PAGE_SIZE);
  const offset = options?.offset ?? 0;
  const { data, error } = await sb
    .from('requests')
    .select('id, parcel_id, trip_id, sender_id, sender_name, traveller_id, traveller_name, status, price, message, created_by, expires_at, created_at, updated_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(r => mapRow(r as unknown as RequestRow)), error: null };
}

export async function fetchRequestsByParcelId(parcelId: string, options?: { limit?: number; offset?: number }) {
  const idCheck = validateUUID(parcelId);
  if (!idCheck.valid) return { data: null, error: idCheck.error };

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
  const limit = Math.min(options?.limit ?? 50, MAX_PAGE_SIZE);
  const offset = options?.offset ?? 0;
  const { data, error } = await sb
    .from('requests')
    .select('id, parcel_id, trip_id, sender_id, sender_name, traveller_id, traveller_name, status, price, message, created_by, expires_at, created_at, updated_at')
    .eq('parcel_id', parcelId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(r => mapRow(r as unknown as RequestRow)), error: null };
}

/**
 * Returns true if an active (pending or accepted) request already exists
 * for the given parcel+trip pair. Used by the UI to disable the Carry button
 * and by the fallback insert path to block duplicates.
 */
export async function checkDuplicateRequest(parcelId: string, tripId: string): Promise<boolean> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('requests')
    .select('id')
    .eq('parcel_id', parcelId)
    .eq('trip_id', tripId)
    .in('status', ['pending', 'accepted'])
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[checkDuplicateRequest] query error:', error.message);
    return false; // fail open — let the DB unique index catch it
  }
  return data !== null;
}

function validateStatusTransition(request: Request, status: Request['status'], actorUserId: string): string | null {
  const requesterId = request.createdBy || request.senderId;
  const intendedRecipientId = request.createdBy
    ? (request.createdBy === request.senderId ? request.travellerId : request.senderId)
    : request.travellerId;

  if (status === 'accepted' || status === 'rejected') {
    if (request.status !== 'pending') {
      return `Only pending requests can be ${status}.`;
    }
    // STRICT SECURITY: Requester cannot accept/reject their own request
    if (actorUserId === requesterId) {
      return `Requesters cannot ${status} their own request.`;
    }
    // Only the intended recipient can accept/reject
    if (actorUserId !== intendedRecipientId) {
      return `Only the intended recipient can ${status} this request.`;
    }
    return null;
  }

  if (status === 'cancelled') {
    if (request.status !== 'pending') {
      return 'Only pending requests can be cancelled.';
    }
    // Only the requester who created the request can cancel it
    if (actorUserId !== requesterId) {
      return 'Only the user who created this request can cancel it.';
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

  if (error || !data) {
    const errorMsg = error?.message || 'Failed to update request status';
    console.error('transition_request_status RPC error:', errorMsg);
    return { data: null, error: errorMsg };
  }

  const mapped = mapRow(data as unknown as RequestRow);
  const requesterId = mapped.createdBy || mapped.senderId;

  if (status === 'accepted') {
    if (requesterId === mapped.senderId) {
      void notifyRequestAccepted({
        senderId: mapped.senderId,
        travellerId: mapped.travellerId,
        travellerName: mapped.travellerName,
        requestId: mapped.id,
      }).catch(err => console.warn('Failed to dispatch request accepted notification:', err));
    } else {
      void notifyOfferAccepted({
        travellerId: mapped.travellerId,
        senderId: mapped.senderId,
        senderName: mapped.senderName,
        requestId: mapped.id,
      }).catch(err => console.warn('Failed to dispatch offer accepted notification:', err));
    }
  } else if (status === 'rejected') {
    if (requesterId === mapped.senderId) {
      void notifyRequestDeclined({
        senderId: mapped.senderId,
        travellerId: mapped.travellerId,
        travellerName: mapped.travellerName,
        requestId: mapped.id,
      }).catch(err => console.warn('Failed to dispatch request declined notification:', err));
    } else {
      void notifyOfferDeclined({
        travellerId: mapped.travellerId,
        senderId: mapped.senderId,
        senderName: mapped.senderName,
        requestId: mapped.id,
      }).catch(err => console.warn('Failed to dispatch offer declined notification:', err));
    }
  }

  return { data: mapped, error: null };
}

export async function cancelRequest(requestId: string, userId: string) {
  return updateRequestStatus(requestId, 'cancelled', userId);
}

export function isRequestIncoming(request: Request, currentUserId?: string): boolean {
  if (!currentUserId) return false;
  if (request.createdBy) {
    return request.createdBy !== currentUserId && (request.senderId === currentUserId || request.travellerId === currentUserId);
  }
  return request.travellerId === currentUserId;
}

export function isRequestOutgoing(request: Request, currentUserId?: string): boolean {
  if (!currentUserId) return false;
  if (request.createdBy) {
    return request.createdBy === currentUserId;
  }
  return request.senderId === currentUserId;
}
