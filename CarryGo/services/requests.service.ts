import { getSupabaseClient } from '@/template';
import { Request } from '@/types';
import { sanitizeTextInput } from '@/lib/sanitize';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { validateUUID, validateAmount, validateDescription } from '@/lib/validation';

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
  message?: string;
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
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchRequests(userId: string, options?: { limit?: number; offset?: number }) {
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
  const sb = getSupabaseClient();
  const { data, error } = await sb.from('requests').select('*').eq('id', requestId).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data), error: null };
}

export async function createRequest(req: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>) {
  const rateCheck = await enforceRateLimit(req.senderId, 'create_request');
  if (!rateCheck.allowed) {
    return { data: null, error: rateCheck.error ?? 'Rate limit exceeded. Please try again later.' };
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

  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc('create_request_command', {
    p_parcel_id: req.parcelId,
    p_trip_id: req.tripId,
    p_price: req.price,
    p_message: message,
  }).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data as unknown as RequestRow), error: null };
}

export async function fetchRequestsByTripId(tripId: string) {
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
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('requests')
    .select('*')
    .eq('parcel_id', parcelId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(r => mapRow(r as unknown as RequestRow)), error: null };
}

export async function updateRequestStatus(requestId: string, status: Request['status'], userId: string) {
  const rateCheck = await enforceRateLimit(userId, 'create_request');
  if (!rateCheck.allowed) {
    return { data: null, error: rateCheck.error ?? 'Rate limit exceeded. Please try again later.' };
  }

  const idValidation = validateUUID(requestId);
  if (!idValidation.valid) {
    return { data: null, error: idValidation.error };
  }

  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc('transition_request_status', {
    p_request_id: requestId,
    p_next_status: status,
  }).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data as unknown as RequestRow), error: null };
}
