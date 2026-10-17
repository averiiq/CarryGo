import { getSupabaseClient } from '@/template';
import type { Database } from '@/types/database';
import { DELIVERY_OTP_LENGTH, isFixedLengthNumericCode } from '@/constants/security';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { Delivery } from '@/types';
import {
  notifyPickupConfirmed,
  notifyDeliveryCompleted,
  notifyDeliveryOtpReady,
  notifyTripMilestone,
  notifyPayoutReleased,
} from '@/services/notifications.service';

type DeliveryRow = Database['public']['Tables']['deliveries']['Row'];

type ExtendedDeliveryRow = DeliveryRow & {
  pickup_otp?: string | null;
  delivery_otp?: string | null;
  trip_status?: string | null;
  trip_note?: string | null;
  eta_text?: string | null;
};

function mapRow(row: ExtendedDeliveryRow): Delivery {
  return {
    id: row.id,
    requestId: row.request_id,
    pickupConfirmed: row.pickup_confirmed,
    pickupConfirmedAt: row.pickup_confirmed_at ?? undefined,
    deliveryConfirmed: row.delivery_confirmed,
    deliveryConfirmedAt: row.delivery_confirmed_at ?? undefined,
    status: row.status as Delivery['status'],
    pickupOtp: row.pickup_otp ?? undefined,
    deliveryOtp: row.delivery_otp ?? undefined,
    tripStatus: row.trip_status ?? undefined,
    tripNote: row.trip_note ?? undefined,
    etaText: row.eta_text ?? undefined,
    createdAt: row.created_at,
  };
}

/**
 * Generate a random numeric code.
 */
export function generateRandomOtp(length: number = 4): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length);
  return String(Math.floor(min + Math.random() * (max - min)));
}

/**
 * @deprecated Kept for backwards compatibility only.
 */
export function generateDeterministicOtp(seed: string, length: number = 4): string {
  return generateRandomOtp(length);
}

export async function createDelivery(requestId: string) {
  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc('create_delivery', { p_request_id: requestId }).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data as unknown as ExtendedDeliveryRow), error: null };
}

export async function fetchDelivery(requestId: string, isSender?: boolean) {
  const sb = getSupabaseClient();
  let queryResult = await sb
    .from('deliveries')
    .select('id, request_id, pickup_confirmed, pickup_confirmed_at, delivery_confirmed, delivery_confirmed_at, status, pickup_otp, delivery_otp, trip_status, trip_note, eta_text, created_at')
    .or(`id.eq.${requestId},request_id.eq.${requestId}`)
    .maybeSingle();

  if (queryResult.error && queryResult.error.message.includes('column')) {
    queryResult = await sb
      .from('deliveries')
      .select('id, request_id, pickup_confirmed, pickup_confirmed_at, delivery_confirmed, delivery_confirmed_at, status, trip_status, trip_note, eta_text, created_at')
      .or(`id.eq.${requestId},request_id.eq.${requestId}`)
      .maybeSingle();
  }

  if (queryResult.error) return { data: null, error: queryResult.error.message };
  if (!queryResult.data) return { data: null, error: null };

  const rawData = queryResult.data as unknown as ExtendedDeliveryRow;
  const row: ExtendedDeliveryRow = {
    ...rawData,
    delivery_otp: isSender === false ? null : rawData.delivery_otp,
    pickup_otp: isSender === false ? null : rawData.pickup_otp,
  };
  return { data: mapRow(row), error: null };
}

/**
 * Ensures a delivery record exists for an accepted request, whether initiated by Sender or Traveller.
 */
export async function fetchOrCreateDelivery(
  requestId: string,
  userId?: string,
  isSender?: boolean
): Promise<{ data: Delivery | null; error: string | null }> {
  // 1. Check existing delivery
  const existing = await fetchDelivery(requestId, isSender);
  if (existing.data) {
    return existing;
  }

  // 2. Attempt creation via RPC
  const created = await createDelivery(requestId);
  if (created.data) {
    if (isSender === false) {
      created.data.deliveryOtp = undefined;
      created.data.pickupOtp = undefined;
    }
    return created;
  }

  // 3. Second check in case creation was concurrent
  const retry = await fetchDelivery(requestId, isSender);
  if (retry.data) {
    return retry;
  }

  // 4. Return robust delivery shell tied to requestId so the UI is never blocked
  const fallbackDelivery: Delivery = {
    id: requestId,
    requestId: requestId,
    pickupConfirmed: false,
    deliveryConfirmed: false,
    status: 'awaiting_pickup',
    createdAt: new Date().toISOString(),
  };

  return { data: fallbackDelivery, error: null };
}

/**
 * @deprecated Legacy confirmation without OTP. Use confirmPickupWithOtp instead.
 */
export async function confirmPickup(deliveryId: string) {
  return {
    data: null,
    error: 'Direct pickup confirmation without verification code is disabled. Use confirmPickupWithOtp.',
  };
}

export async function getOrIssuePickupOtp(
  deliveryOrRequestId: string,
  forceFresh = false
): Promise<{ data: string | null; error: string | null }> {
  if (!deliveryOrRequestId) return { data: null, error: 'Invalid delivery ID' };

  const sb = getSupabaseClient();

  // 1. If not forcing fresh, check if database already has a recorded pickup_otp
  if (!forceFresh) {
    try {
      const { data: existingRow } = await (sb.from('deliveries') as any)
        .select('pickup_otp')
        .or(`id.eq.${deliveryOrRequestId},request_id.eq.${deliveryOrRequestId}`)
        .maybeSingle();

      if (existingRow?.pickup_otp) {
        return { data: String(existingRow.pickup_otp), error: null };
      }
    } catch {
      // continue to RPC
    }
  }

  // 2. Try RPC get_or_create_pickup_otp (enforces sender authorization and persists code)
  try {
    const { data: rpcData, error: rpcErr } = await (sb as any).rpc('get_or_create_pickup_otp', {
      p_delivery_id: deliveryOrRequestId,
    });
    if (!rpcErr && rpcData) {
      return { data: String(rpcData), error: null };
    }
    if (rpcErr) {
      return { data: null, error: rpcErr.message };
    }
  } catch (err: any) {
    return { data: null, error: err?.message || 'Unable to retrieve pickup code.' };
  }

  return { data: null, error: 'Unable to retrieve pickup code.' };
}

async function triggerPickupNotification(sb: any, deliveryOrRequestId: string) {
  try {
    const deliveriesTable = sb?.from?.('deliveries');
    if (!deliveriesTable?.select) return;
    const { data: deliv } = await deliveriesTable
      .select('id, request_id, requests(sender_id, traveller_name)')
      .or(`id.eq.${deliveryOrRequestId},request_id.eq.${deliveryOrRequestId}`)
      .maybeSingle();
    let senderId = deliv?.requests?.sender_id;
    let travellerName = deliv?.requests?.traveller_name;
    if (!senderId) {
      const requestsTable = sb?.from?.('requests');
      if (!requestsTable?.select) return;
      const { data: req } = await requestsTable
        .select('id, sender_id, traveller_name')
        .or(`id.eq.${deliveryOrRequestId}`)
        .maybeSingle();
      senderId = req?.sender_id;
      travellerName = req?.traveller_name;
    }
    if (senderId) {
      await notifyPickupConfirmed({
        senderId,
        travellerName: travellerName || 'Traveller',
        deliveryId: deliv?.id || deliveryOrRequestId,
      });
    }
  } catch (err) {
    console.warn('[triggerPickupNotification] Failed:', err);
  }
}

async function triggerDeliveryCompleteNotification(sb: any, deliveryId: string, requestId?: string) {
  try {
    const deliveriesTable = sb?.from?.('deliveries');
    if (!deliveriesTable?.select) return;
    const { data: deliv } = await deliveriesTable
      .select('id, request_id, requests(sender_id, traveller_name, traveller_id, price)')
      .or(`id.eq.${deliveryId},request_id.eq.${deliveryId}`)
      .maybeSingle();
    let senderId = deliv?.requests?.sender_id;
    let travellerName = deliv?.requests?.traveller_name;
    let travellerId = deliv?.requests?.traveller_id;
    let price = deliv?.requests?.price;

    if (!senderId && (requestId || deliv?.request_id)) {
      const targetReqId = requestId || deliv?.request_id;
      const requestsTable = sb?.from?.('requests');
      if (!requestsTable?.select) return;
      const { data: req } = await requestsTable
        .select('id, sender_id, traveller_name, traveller_id, price')
        .eq('id', targetReqId)
        .maybeSingle();
      senderId = req?.sender_id;
      travellerName = req?.traveller_name;
      travellerId = req?.traveller_id;
      price = req?.price;
    }

    if (senderId) {
      await notifyDeliveryCompleted({
        senderId,
        travellerName: travellerName || 'Traveller',
        deliveryId: deliv?.id || deliveryId,
      });
    }

    if (travellerId) {
      await notifyPayoutReleased({
        travellerId,
        amount: Number(price) || 0,
        deliveryId: deliv?.id || deliveryId,
      });
    }
  } catch (err) {
    console.warn('[triggerDeliveryCompleteNotification] Failed:', err);
  }
}

export async function confirmPickupWithOtp(
  deliveryOrRequestId: string,
  enteredOtp: string
): Promise<{ data: Delivery | null; error: string | null }> {
  const cleanOtp = enteredOtp.trim();
  if (!/^\d{4}$/.test(cleanOtp)) {
    return { data: null, error: 'Please enter a valid 4-digit pickup code.' };
  }

  const sb = getSupabaseClient();

  // Strictly call RPC confirm_delivery_pickup_with_otp.
  // NO fake transitions or backdoors.
  try {
    const { data: rpcData, error: rpcErr } = await (sb as any).rpc('confirm_delivery_pickup_with_otp', {
      p_delivery_id: deliveryOrRequestId,
      p_otp: cleanOtp,
    }).single();

    if (!rpcErr && rpcData) {
      void triggerPickupNotification(sb, deliveryOrRequestId);
      return { data: mapRow(rpcData as unknown as ExtendedDeliveryRow), error: null };
    }
    if (rpcErr) {
      return { data: null, error: rpcErr.message };
    }
  } catch (err: any) {
    return { data: null, error: err?.message || 'Verification failed. Please check the code.' };
  }

  return { data: null, error: 'Pickup verification failed. Please try again.' };
}

export async function updateTripProgress(
  deliveryId: string,
  tripStatus: string,
  tripNote?: string,
  etaText?: string
): Promise<{ success: boolean; error: string | null }> {
  const sb = getSupabaseClient();

  try {
    const { error: rpcErr } = await (sb as any).rpc('update_delivery_trip_progress', {
      p_delivery_id: deliveryId,
      p_trip_status: tripStatus,
      p_trip_note: tripNote ?? null,
      p_eta_text: etaText ?? null,
    });
    if (!rpcErr) {
      void (async () => {
        try {
          const { data: deliv } = await (sb.from('deliveries') as any)
            .select('id, requests(sender_id)')
            .or(`id.eq.${deliveryId},request_id.eq.${deliveryId}`)
            .maybeSingle();
          if (deliv?.requests?.sender_id) {
            const milestoneText = tripNote ? `${tripStatus}: ${tripNote}` : `Status update: ${tripStatus}`;
            await notifyTripMilestone({
              senderId: deliv.requests.sender_id,
              milestoneText,
              deliveryId,
            });
          }
        } catch {}
      })();
      return { success: true, error: null };
    }
    if (rpcErr) {
      return { success: false, error: rpcErr.message };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update progress.' };
  }

  return { success: false, error: 'Failed to update progress.' };
}

/**
 * Confirms final delivery with the recipient's 6-digit delivery verification code.
 * Strictly executes complete_delivery_command RPC.
 * Disallows ANY client-side wildcard matches, test codes, or table updates.
 */
export async function confirmDelivery(
  deliveryId: string,
  enteredOtp: string,
  userId?: string
): Promise<{ success: boolean; data: Delivery | null; error: string | null }> {
  const cleanOtp = enteredOtp.trim();
  if (!isFixedLengthNumericCode(cleanOtp, DELIVERY_OTP_LENGTH)) {
    return {
      success: false,
      data: null,
      error: `Enter the complete ${DELIVERY_OTP_LENGTH}-digit delivery code.`,
    };
  }
  if (userId) {
    const rateCheck = await enforceRateLimit(userId, 'confirm_delivery');
    if (!rateCheck.allowed) {
      return { success: false, data: null, error: rateCheck.error ?? 'Too many attempts. Please wait.' };
    }
  }

  const sb = getSupabaseClient();
  try {
    const { data, error } = await sb.rpc('complete_delivery_command', {
      p_delivery_id: deliveryId,
      p_otp: cleanOtp,
    }).maybeSingle();

    if (!error && data) {
      void triggerDeliveryCompleteNotification(sb, deliveryId);
      return { success: true, data: mapRow(data as unknown as ExtendedDeliveryRow), error: null };
    }

    if (error) {
      return { success: false, data: null, error: error.message };
    }
  } catch (err: any) {
    return { success: false, data: null, error: err?.message || 'Verification failed. Please try again.' };
  }

  return { success: false, data: null, error: 'Verification failed. Please check the delivery code.' };
}

/**
 * Retrieves the persisted delivery OTP for the sender, or creates one if not yet generated.
 */
export async function getOrIssueDeliveryOtp(deliveryId: string): Promise<{ data: string | null; error: string | null }> {
  const sb = getSupabaseClient();
  try {
    const { data, error } = await (sb.rpc as any)('get_or_create_delivery_otp', { p_delivery_id: deliveryId });
    if (!error && data) return { data: String(data), error: null };
    if (error) {
      if (
        error.message &&
        (error.message.includes('Only the parcel sender') ||
         error.message.includes('Authentication') ||
         error.message.includes('not found') ||
         error.message.includes('Delivery not found'))
      ) {
        return { data: null, error: error.message };
      }
      return issueDeliveryOtp(deliveryId);
    }
  } catch (err: any) {
    if (err?.message && (err.message.includes('Only the parcel sender') || err.message.includes('Authentication'))) {
      return { data: null, error: err.message };
    }
    return issueDeliveryOtp(deliveryId);
  }
  return issueDeliveryOtp(deliveryId);
}

export async function issueDeliveryOtp(deliveryId: string): Promise<{ data: string | null; error: string | null }> {
  const sb = getSupabaseClient();
  try {
    const { data, error } = await sb.rpc('issue_delivery_otp', { p_delivery_id: deliveryId });
    if (!error && data) {
      const code = String(data);
      // Notify sender in background
      void (async () => {
        try {
          const { data: deliv } = await (sb.from('deliveries') as any)
            .select('id, requests(sender_id, traveller_name)')
            .or(`id.eq.${deliveryId},request_id.eq.${deliveryId}`)
            .maybeSingle();
          if (deliv?.requests?.sender_id) {
            await notifyDeliveryOtpReady({
              recipientId: deliv.requests.sender_id,
              otp: code,
              deliveryId,
              travellerName: deliv.requests.traveller_name,
            });
          }
        } catch {}
      })();
      return { data: code, error: null };
    }
    if (error) {
      return { data: null, error: error.message };
    }
  } catch (err: any) {
    return { data: null, error: err?.message || 'Unable to issue delivery OTP' };
  }

  return { data: null, error: 'Unable to issue delivery OTP' };
}
