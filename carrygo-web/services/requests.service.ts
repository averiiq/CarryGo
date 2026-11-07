/**
 * Requests service (web) — thin wrappers around the security-definer RPCs
 * that govern the request lifecycle. All state transitions happen server-side.
 *
 * Mirrors the mobile `CarryGo/services/requests.service.ts` surface so the
 * negotiation / accept / decline / cancel semantics are identical.
 */

import { createClient } from '@/utils/supabase/client'

export type ServiceResult<T> = { data: T; error: null } | { data: null; error: string }

export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'completed'

export interface RequestRow {
  id: string
  parcel_id: string
  trip_id: string
  sender_id: string
  sender_name: string
  traveller_id: string
  traveller_name: string
  status: RequestStatus
  price: number
  message: string | null
  created_by: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

function extractId(value: unknown): string | null {
  if (!value) return null
  if (Array.isArray(value)) return extractId(value[0])
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }
  return null
}

export async function createRequest(params: {
  parcelId: string
  tripId: string
  price: number
  message?: string | null
}): Promise<ServiceResult<{ requestId: string }>> {
  if (!params.parcelId || !params.tripId) {
    return { data: null, error: 'Parcel and trip are required.' }
  }
  if (!Number.isFinite(params.price) || params.price <= 0) {
    return { data: null, error: 'Price must be a positive number.' }
  }

  const sb = createClient()
  const { data, error } = await sb.rpc('create_request_command', {
    p_parcel_id: params.parcelId,
    p_trip_id: params.tripId,
    p_price: Math.round(params.price),
    p_message: params.message?.trim() ? params.message.trim() : null,
  })

  if (error) return { data: null, error: error.message }
  const id = extractId(data)
  if (!id) return { data: null, error: 'Unexpected response — request ID missing.' }
  return { data: { requestId: id }, error: null }
}

/**
 * The web has no dedicated "counter_offer" RPC — a counter-offer is a new
 * `create_request_command` with a different price, by whichever side is
 * negotiating. The server enforces: only sender OR traveller can create;
 * duplicate guard is a unique partial index on (parcel_id, trip_id).
 */
export async function sendCounterOffer(params: {
  parcelId: string
  tripId: string
  offeredPrice: number
  pickupLandmark: string
  dropLandmark: string
  note?: string
  travellerName?: string
  listedPrice?: number
}): Promise<ServiceResult<{ requestId: string; message: string }>> {
  const message = [
    `🤝 Delivery Negotiation Proposed:`,
    `• Offered Fare: ₹${params.offeredPrice}${
      params.listedPrice ? ` (Listed: ₹${params.listedPrice})` : ''
    }`,
    `• Pickup Spot: ${params.pickupLandmark}`,
    `• Drop-off Spot: ${params.dropLandmark}`,
    params.note?.trim() ? `• Note: "${params.note.trim()}"` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const result = await createRequest({
    parcelId: params.parcelId,
    tripId: params.tripId,
    price: params.offeredPrice,
    message,
  })

  if (!result.data) return { data: null, error: result.error ?? 'Could not send offer.' }
  return { data: { requestId: result.data.requestId, message }, error: null }
}

export async function transitionRequestStatus(
  requestId: string,
  nextStatus: Exclude<RequestStatus, 'pending'>,
): Promise<ServiceResult<{ status: RequestStatus }>> {
  const sb = createClient()
  const { error } = await sb.rpc('transition_request_status', {
    p_request_id: requestId,
    p_next_status: nextStatus,
  })
  if (error) return { data: null, error: error.message }
  return { data: { status: nextStatus }, error: null }
}

export async function createConversationForRequest(
  requestId: string,
): Promise<ServiceResult<{ conversationId: string }>> {
  const sb = createClient()
  const { data, error } = await sb.rpc('create_conversation_for_request', {
    p_request_id: requestId,
  })
  if (error) return { data: null, error: error.message }
  const id = extractId(data)
  if (!id) return { data: null, error: 'Unexpected response — conversation ID missing.' }
  return { data: { conversationId: id }, error: null }
}

export async function fetchRequestsForUser(
  userId: string,
): Promise<ServiceResult<RequestRow[]>> {
  const sb = createClient()
  const { data, error } = await sb
    .from('requests')
    .select('*')
    .or(`sender_id.eq.${userId},traveller_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) return { data: null, error: error.message }
  return { data: (data ?? []) as RequestRow[], error: null }
}
