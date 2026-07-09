import { getSupabaseClient } from '@/template';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { DELIVERY_OTP_LENGTH, isFixedLengthNumericCode } from '@/constants/security';
import { Delivery } from '@/types';

interface DeliveryRow {
  id: string;
  request_id: string;
  pickup_confirmed: boolean;
  pickup_confirmed_at?: string;
  delivery_confirmed: boolean;
  delivery_confirmed_at?: string;
  status: string;
  created_at: string;
}

function mapRow(row: DeliveryRow): Delivery {
  return {
    id: row.id,
    requestId: row.request_id,
    pickupConfirmed: row.pickup_confirmed,
    pickupConfirmedAt: row.pickup_confirmed_at,
    deliveryConfirmed: row.delivery_confirmed,
    deliveryConfirmedAt: row.delivery_confirmed_at,
    status: row.status as Delivery['status'],
    createdAt: row.created_at,
  };
}

export async function createDelivery(requestId: string) {
  if (!FeatureFlags.secureDeliveryConfirmation) {
    return { data: null, error: disabledFeatureMessage.delivery };
  }
  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc('create_delivery', { p_request_id: requestId }).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data as unknown as DeliveryRow), error: null };
}

export async function fetchDelivery(requestId: string) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('deliveries')
    .select('id, request_id, pickup_confirmed, pickup_confirmed_at, delivery_confirmed, delivery_confirmed_at, status, created_at')
    .eq('request_id', requestId)
    .single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data as unknown as DeliveryRow), error: null };
}

export async function confirmPickup(deliveryId: string) {
  if (!FeatureFlags.secureDeliveryConfirmation) {
    return { data: null, error: disabledFeatureMessage.delivery };
  }
  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc('confirm_delivery_pickup', { p_delivery_id: deliveryId }).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data as unknown as DeliveryRow), error: null };
}

export async function confirmDelivery(deliveryId: string, enteredOtp: string) {
  if (!FeatureFlags.secureDeliveryConfirmation) {
    return { success: false, error: disabledFeatureMessage.delivery };
  }
  if (!isFixedLengthNumericCode(enteredOtp, DELIVERY_OTP_LENGTH)) {
    return {
      success: false,
      error: `Enter the complete ${DELIVERY_OTP_LENGTH}-digit delivery code.`,
    };
  }
  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc('complete_delivery_command', {
    p_delivery_id: deliveryId,
    p_otp: enteredOtp,
  }).single();
  if (error) return { success: false, data: null, error: error.message };
  return { success: true, data: mapRow(data as unknown as DeliveryRow), error: null };
}
