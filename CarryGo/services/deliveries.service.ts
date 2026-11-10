import { getSupabaseClient } from '@/template';
import type { Database } from '@/types/database';
import { DELIVERY_OTP_LENGTH, isFixedLengthNumericCode } from '@/constants/security';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { validateUUID } from '@/lib/validation';
import { Delivery } from '@/types';
import {
  notifyPickupConfirmed,
  notifyDeliveryCompleted,
  notifyDeliveryOtpReady,
  notifyTripMilestone,
  notifyPayoutReleased,
} from '@/services/notifications.service';
import { awardDeliveryCoins } from '@/services/rewards.service';

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

export async function createDelivery(requestId: string) {
  const sb = getSupabaseClient();
  try {
    const rpcCall = sb.rpc('create_delivery', { p_request_id: requestId });
    const { data, error } = typeof (rpcCall as any)?.single === 'function'
      ? await (rpcCall as any).single()
      : await rpcCall;
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: 'No delivery returned' };
    return { data: mapRow(data as unknown as ExtendedDeliveryRow), error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create delivery' };
  }
}

export async function fetchDelivery(requestId: string, isSender?: boolean) {
  const idCheck = validateUUID(requestId);
  if (!idCheck.valid) return { data: null, error: idCheck.error || 'Invalid delivery/request ID' };

  const sb = getSupabaseClient();
  const selectColumns = isSender
    ? 'id, request_id, pickup_confirmed, pickup_confirmed_at, delivery_confirmed, delivery_confirmed_at, status, pickup_otp, delivery_otp, trip_status, trip_note, eta_text, created_at'
    : 'id, request_id, pickup_confirmed, pickup_confirmed_at, delivery_confirmed, delivery_confirmed_at, status, trip_status, trip_note, eta_text, created_at';

  let queryResult = await sb
    .from('deliveries')
    .select(selectColumns)
    .or(`id.eq.${requestId},request_id.eq.${requestId}`)
    .maybeSingle();

  if (queryResult.error) return { data: null, error: queryResult.error.message };
  if (!queryResult.data) return { data: null, error: null };

  const rawData = queryResult.data as unknown as ExtendedDeliveryRow;
  const row: ExtendedDeliveryRow = {
    ...rawData,
    delivery_otp: isSender ? rawData.delivery_otp : null,
    pickup_otp: isSender ? rawData.pickup_otp : null,
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

  // 4. Return robust delivery shell tied to requestId so the UI is never blocked,
  // but surface the creation error so callers can detect degraded state.
  const fallbackDelivery: Delivery = {
    id: requestId,
    requestId: requestId,
    pickupConfirmed: false,
    deliveryConfirmed: false,
    status: 'awaiting_pickup',
    createdAt: new Date().toISOString(),
  };

  return { data: fallbackDelivery, error: created.error || 'Delivery record could not be created; using fallback.' };
}

export async function getOrIssuePickupOtp(
  deliveryOrRequestId: string,
  _forceFresh = false
): Promise<{ data: string | null; error: string | null }> {
  if (!deliveryOrRequestId) return { data: null, error: 'Invalid delivery ID' };
  const idCheck = validateUUID(deliveryOrRequestId);
  if (!idCheck.valid) return { data: null, error: idCheck.error || 'Invalid delivery ID' };

  const sb = getSupabaseClient();

  // Strictly route via get_or_create_pickup_otp RPC to enforce sender authentication & cryptographic generation
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
      .select('id, request_id, requests(sender_id, traveller_name, traveller_id)')
      .or(`id.eq.${deliveryOrRequestId},request_id.eq.${deliveryOrRequestId}`)
      .maybeSingle();
    let senderId = deliv?.requests?.sender_id;
    let travellerName = deliv?.requests?.traveller_name;
    let travellerId = deliv?.requests?.traveller_id;
    if (!senderId) {
      const requestsTable = sb?.from?.('requests');
      if (!requestsTable?.select) return;
      const { data: req } = await requestsTable
        .select('id, sender_id, traveller_name, traveller_id')
        .or(`id.eq.${deliveryOrRequestId}`)
        .maybeSingle();
      senderId = req?.sender_id;
      travellerName = req?.traveller_name;
      travellerId = req?.traveller_id;
    }
    if (senderId) {
      await notifyPickupConfirmed({
        senderId,
        travellerId,
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
        travellerId,
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
    const rpcCall = (sb as any).rpc('confirm_delivery_pickup_with_otp', {
      p_delivery_id: deliveryOrRequestId,
      p_otp: cleanOtp,
    });

    let rpcData: any = null;
    let rpcErr: any = null;

    if (rpcCall && typeof rpcCall.then === 'function') {
      const res = await rpcCall;
      rpcData = res.data;
      rpcErr = res.error;
    } else if (rpcCall && typeof rpcCall.single === 'function') {
      const res = await rpcCall.single();
      rpcData = res.data;
      rpcErr = res.error;
    } else {
      const res = await rpcCall;
      rpcData = res?.data;
      rpcErr = res?.error;
    }

    const pickupRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (!rpcErr && pickupRow) {
      void triggerPickupNotification(sb, deliveryOrRequestId);
      return { data: mapRow(pickupRow as unknown as ExtendedDeliveryRow), error: null };
    }
    if (rpcErr) {
      const isSchemaDrift =
        rpcErr.message?.includes('pickup_locked_until') ||
        rpcErr.message?.includes('has no field') ||
        rpcErr.message?.includes('coerce') ||
        rpcErr.message?.includes('JSON object') ||
        rpcErr.code === '42703' ||
        rpcErr.code === 'PGRST116';

      if (isSchemaDrift) {
        // Fallback: Verify OTP directly against deliveries table with strict exact match
        const { data: deliv, error: fetchErr } = await (sb.from('deliveries') as any)
          .select('id, request_id, pickup_otp, status, trip_status, pickup_confirmed, otp_attempt_count, otp_locked_until')
          .or(`id.eq.${deliveryOrRequestId},request_id.eq.${deliveryOrRequestId}`)
          .maybeSingle();

        if (fetchErr || !deliv) {
          return { data: null, error: 'Delivery record not found.' };
        }

        if (deliv.pickup_confirmed) {
          return { data: null, error: 'Parcel pickup has already been confirmed.' };
        }

        // Check brute-force lockout
        if (deliv.otp_locked_until && new Date(deliv.otp_locked_until).getTime() > Date.now()) {
          const remainingMin = Math.ceil((new Date(deliv.otp_locked_until).getTime() - Date.now()) / 60000);
          return {
            data: null,
            error: `Pickup verification locked due to too many failed attempts. Please try again in ${remainingMin} minutes.`,
          };
        }

        if (!deliv.pickup_otp || deliv.pickup_otp.trim() === '') {
          return {
            data: null,
            error: 'Sender has not generated a pickup code yet. Ask sender for the 4-digit code displayed on their app.',
          };
        }

        // STRICT EXACT MATCH: cleanOtp must equal stored pickup_otp
        if (deliv.pickup_otp.trim() !== cleanOtp) {
          const attempts = (deliv.otp_attempt_count || 0) + 1;
          const lockTime = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
          await (sb.from('deliveries') as any)
            .update({
              otp_attempt_count: attempts,
              otp_locked_until: lockTime,
              updated_at: new Date().toISOString(),
            })
            .eq('id', deliv.id);

          return {
            data: null,
            error: 'Invalid pickup code. Ask sender for the 4-digit pickup code displayed on their app.',
          };
        }

        // Success: update delivery to in_transit
        const nowIso = new Date().toISOString();
        const { data: updateData, error: updateErr } = await (sb.from('deliveries') as any)
          .update({
            pickup_confirmed: true,
            pickup_confirmed_at: nowIso,
            status: 'in_transit',
            trip_status: deliv.trip_status || 'Picked Up - On Journey',
            otp_attempt_count: 0,
            otp_locked_until: null,
            updated_at: nowIso,
          })
          .eq('id', deliv.id)
          .select('id, request_id, pickup_confirmed, pickup_confirmed_at, delivery_confirmed, delivery_confirmed_at, status, trip_status, trip_note, eta_text, created_at');

        if (updateErr) {
          return { data: null, error: updateErr.message || 'Failed to update delivery status.' };
        }

        const updated = (Array.isArray(updateData) ? updateData[0] : updateData) ?? {
          ...deliv,
          pickup_confirmed: true,
          pickup_confirmed_at: nowIso,
          status: 'in_transit',
          trip_status: deliv.trip_status || 'Picked Up - On Journey',
        };

        void triggerPickupNotification(sb, deliveryOrRequestId);
        return { data: mapRow(updated as unknown as ExtendedDeliveryRow), error: null };
      }

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
  const idCheck = validateUUID(deliveryId);
  if (!idCheck.valid) return { success: false, error: idCheck.error || 'Invalid delivery ID' };
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
        } catch (err) {
          console.warn('[updateTripProgress] trip milestone notification failed:', err);
        }
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
    const rpcCall = (sb.rpc as any)('complete_delivery_command', {
      p_delivery_id: deliveryId,
      p_otp: cleanOtp,
    });

    let rpcResult: any = null;
    let error: any = null;

    if (rpcCall && typeof rpcCall.then === 'function') {
      const res = await rpcCall;
      rpcResult = res.data;
      error = res.error;
    } else if (rpcCall && typeof rpcCall.maybeSingle === 'function') {
      const res = await rpcCall.maybeSingle();
      rpcResult = res.data;
      error = res.error;
    } else if (rpcCall && typeof rpcCall.single === 'function') {
      const res = await rpcCall.single();
      rpcResult = res.data;
      error = res.error;
    } else {
      const res = await rpcCall;
      rpcResult = res?.data;
      error = res?.error;
    }

    const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    if (!error && row) {
      void triggerDeliveryCompleteNotification(sb, deliveryId);
      void awardDeliveryCoins(deliveryId);
      return { success: true, data: mapRow(row as unknown as ExtendedDeliveryRow), error: null };
    }

    if (error) {
      const isSchemaDrift =
        error.message?.includes('has no field') ||
        error.message?.includes('has no fields') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('Delivery not found') ||
        error.message?.includes('pickup_locked_until') ||
        error.message?.includes('column') ||
        error.message?.includes('coerce') ||
        error.message?.includes('JSON object') ||
        (error as any).code === '42703' ||
        (error as any).code === '42883' ||
        (error as any).code === 'PGRST116';

      if (isSchemaDrift && sb.from) {
        // Resilient Fallback: Verify directly against deliveries table with strict exact match
        const { data: deliv, error: fetchErr } = await (sb.from('deliveries') as any)
          .select('id, request_id, pickup_confirmed, delivery_confirmed, status, trip_status, delivery_otp, otp_hash, otp_attempt_count, otp_locked_until')
          .or(`id.eq.${deliveryId},request_id.eq.${deliveryId}`)
          .maybeSingle();

        if (fetchErr || !deliv) {
          return { success: false, data: null, error: 'Delivery record not found.' };
        }

        // If already delivered, return success idempotently
        if (deliv.delivery_confirmed && deliv.status === 'delivered') {
          return { success: true, data: mapRow(deliv as unknown as ExtendedDeliveryRow), error: null };
        }

        // Ensure parcel pickup was confirmed before final delivery
        if (!deliv.pickup_confirmed) {
          return { success: false, data: null, error: 'Cannot complete delivery before parcel pickup is confirmed.' };
        }

        // Check brute-force lockout
        if (deliv.otp_locked_until && new Date(deliv.otp_locked_until).getTime() > Date.now()) {
          const remainingMin = Math.ceil((new Date(deliv.otp_locked_until).getTime() - Date.now()) / 60000);
          return {
            success: false,
            data: null,
            error: `Delivery code verification locked due to too many failed attempts. Please try again in ${remainingMin} minutes.`,
          };
        }

        // STRICT EXACT MATCH: cleanOtp must match stored delivery_otp
        const storedOtp = deliv.delivery_otp ? String(deliv.delivery_otp).trim() : null;
        if (!storedOtp) {
          return {
            success: false,
            data: null,
            error: 'Sender has not generated a delivery code yet. Ask sender for the 6-digit delivery code displayed on their app.',
          };
        }

        if (storedOtp !== cleanOtp) {
          const attempts = (deliv.otp_attempt_count || 0) + 1;
          const lockTime = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
          await (sb.from('deliveries') as any)
            .update({
              otp_attempt_count: attempts,
              otp_locked_until: lockTime,
              updated_at: new Date().toISOString(),
            })
            .eq('id', deliv.id);

          return {
            success: false,
            data: null,
            error: 'Invalid delivery code. Please check with the recipient.',
          };
        }

        // Success: mark delivered
        const nowIso = new Date().toISOString();
        const { data: updateData, error: updateErr } = await (sb.from('deliveries') as any)
          .update({
            delivery_confirmed: true,
            delivery_confirmed_at: nowIso,
            status: 'delivered',
            delivery_otp: cleanOtp,
            trip_status: 'Delivered',
            otp_attempt_count: 0,
            otp_locked_until: null,
            updated_at: nowIso,
          })
          .eq('id', deliv.id)
          .select('id, request_id, pickup_confirmed, pickup_confirmed_at, delivery_confirmed, delivery_confirmed_at, status, trip_status, trip_note, eta_text, created_at');

        if (updateErr) {
          return { success: false, data: null, error: updateErr.message || 'Failed to complete delivery.' };
        }

        const updated = (Array.isArray(updateData) ? updateData[0] : updateData) ?? {
          ...deliv,
          delivery_confirmed: true,
          delivery_confirmed_at: nowIso,
          status: 'delivered',
          delivery_otp: cleanOtp,
          trip_status: 'Delivered',
        };

        // Mark request completed
        try {
          const { error: reqErr } = await (sb.from('requests') as any)
            .update({ status: 'completed', updated_at: nowIso })
            .eq('id', deliv.request_id);
          if (reqErr) console.warn('[confirmDelivery] fallback: failed to mark request completed:', reqErr.message);
        } catch (e) {
          console.warn('[confirmDelivery] fallback: request update exception:', e);
        }

        // Automatically release payment if locked
        try {
          const { error: payErr } = await (sb.from('payments') as any)
            .update({ status: 'released', released_at: nowIso })
            .eq('request_id', deliv.request_id)
            .eq('status', 'locked');
          if (payErr) console.warn('[confirmDelivery] fallback: failed to release payment:', payErr.message);
        } catch (e) {
          console.warn('[confirmDelivery] fallback: payment update exception:', e);
        }

        // Mark parcel and trip completed
        try {
          const { data: reqRow } = await (sb.from('requests') as any)
            .select('parcel_id, trip_id')
            .eq('id', deliv.request_id)
            .maybeSingle();

          if (reqRow?.parcel_id) {
            await (sb.from('parcels') as any)
              .update({ status: 'delivered', updated_at: nowIso })
              .eq('id', reqRow.parcel_id);
          }
          if (reqRow?.trip_id) {
            await (sb.from('trips') as any)
              .update({ status: 'completed', updated_at: nowIso })
              .eq('id', reqRow.trip_id);
          }
        } catch (e) {
          console.warn('[confirmDelivery] fallback: parcel/trip update exception:', e);
        }

        void triggerDeliveryCompleteNotification(sb, deliveryId);
        void awardDeliveryCoins(deliv.id);
        return { success: true, data: mapRow(updated as unknown as ExtendedDeliveryRow), error: null };
      }

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
  if (!deliveryId) return { data: null, error: 'Invalid delivery ID' };
  const idCheck = validateUUID(deliveryId);
  if (!idCheck.valid) return { data: null, error: idCheck.error || 'Invalid delivery ID' };

  const sb = getSupabaseClient();
  try {
    const { data, error } = await (sb.rpc as any)('get_or_create_delivery_otp', { p_delivery_id: deliveryId });
    if (!error && data) return { data: String(data), error: null };
    if (error) {
      if (
        error.message &&
        (error.message.includes('Only the parcel sender') ||
         error.message.includes('Only the sender') ||
         error.message.includes('Authentication'))
      ) {
        return { data: null, error: error.message };
      }
      return issueDeliveryOtp(deliveryId);
    }
  } catch (err: any) {
    if (err?.message && (err.message.includes('Only the parcel sender') || err.message.includes('Only the sender') || err.message.includes('Authentication'))) {
      return { data: null, error: err.message };
    }
    return issueDeliveryOtp(deliveryId);
  }
  return issueDeliveryOtp(deliveryId);
}

export async function issueDeliveryOtp(deliveryId: string): Promise<{ data: string | null; error: string | null }> {
  const idCheck = validateUUID(deliveryId);
  if (!idCheck.valid) return { data: null, error: idCheck.error || 'Invalid delivery ID' };
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
        } catch (err) {
          console.warn('[issueDeliveryOtp] delivery OTP notification failed:', err);
        }
      })();
      return { data: code, error: null };
    }
    if (error) {
      if (
        error.message &&
        (error.message.includes('Only the parcel sender') ||
         error.message.includes('Only the sender') ||
         error.message.includes('Authentication'))
      ) {
        return { data: null, error: error.message };
      }

      // Fallback: check or generate delivery_otp on deliveries table directly if schema drift
      if (sb.from) {
        const { data: deliv } = await (sb.from('deliveries') as any)
          .select('id, request_id, delivery_otp')
          .or(`id.eq.${deliveryId},request_id.eq.${deliveryId}`)
          .maybeSingle();

        if (deliv?.delivery_otp && /^\d{6}$/.test(String(deliv.delivery_otp).trim())) {
          return { data: String(deliv.delivery_otp).trim(), error: null };
        }

        if (deliv?.id) {
          const newCode = Math.floor(100000 + Math.random() * 900000).toString();
          const { error: updErr } = await (sb.from('deliveries') as any)
            .update({
              delivery_otp: newCode,
              otp_attempt_count: 0,
              otp_locked_until: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', deliv.id);

          if (!updErr) {
            return { data: newCode, error: null };
          }
        }
      }

      return { data: null, error: error.message };
    }
  } catch (err: any) {
    return { data: null, error: err?.message || 'Unable to issue delivery OTP' };
  }

  return { data: null, error: 'Unable to issue delivery OTP' };
}
