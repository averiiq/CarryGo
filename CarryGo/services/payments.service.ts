import { getSupabaseClient } from '@/template';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { Payment } from '@/types';

interface PaymentRow {
  id: string;
  request_id: string;
  sender_id: string;
  traveller_id: string;
  amount: number | string;
  status: string;
  locked_at: string;
  released_at?: string;
  created_at: string;
}

function mapRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    requestId: row.request_id,
    senderId: row.sender_id,
    travellerId: row.traveller_id,
    amount: parseFloat(String(row.amount)),
    status: row.status as Payment['status'],
    lockedAt: row.locked_at,
    releasedAt: row.released_at,
    createdAt: row.created_at,
  };
}

function validateAmount(amount: number): string | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return 'Amount must be a valid number';
  if (amount <= 0) return 'Amount must be greater than zero';
  if (amount > 999999999.99) return 'Amount exceeds maximum allowed value';
  return null;
}

export async function createPayment(payment: Omit<Payment, 'id' | 'lockedAt' | 'createdAt' | 'releasedAt' | 'amount'> & { requestId: string }) {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };

  const sb = getSupabaseClient();

  const { data: request, error: reqError } = await sb
    .from('requests')
    .select('price, sender_id, traveller_id')
    .eq('id', payment.requestId)
    .single();

  if (reqError || !request) return { data: null, error: 'Request not found' };
  if (request.sender_id !== payment.senderId) return { data: null, error: 'Only the sender can create a payment' };

  const serverAmount = Number(request.price);
  const amountError = validateAmount(serverAmount);
  if (amountError) return { data: null, error: amountError };

  const { data, error } = await sb.from('payments').insert({
    request_id: payment.requestId,
    sender_id: payment.senderId,
    traveller_id: payment.travellerId,
    amount: serverAmount,
    status: 'locked',
  }).select().single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data), error: null };
}

export async function fetchPaymentByRequest(requestId: string) {
  if (!FeatureFlags.payments) return { data: null, error: disabledFeatureMessage.payments };
  const sb = getSupabaseClient();
  const { data, error } = await sb.from('payments').select('*').eq('request_id', requestId).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data), error: null };
}

export async function fetchUserPayments(userId: string) {
  if (!FeatureFlags.payments) return { data: [], error: disabledFeatureMessage.payments };
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('payments')
    .select('*')
    .or(`sender_id.eq.${userId},traveller_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(mapRow), error: null };
}

export async function releasePayment(paymentId: string, actorId: string) {
  if (!FeatureFlags.payments) return { error: disabledFeatureMessage.payments };
  if (!actorId) return { error: 'Authentication required' };

  const sb = getSupabaseClient();

  const { data, error } = await sb.rpc('release_payment_atomic', {
    p_payment_id: paymentId,
    p_actor_id: actorId,
  });

  if (error) {
    if (error.message.includes('not found')) return { error: 'Payment not found or already processed.' };
    if (error.message.includes('unauthorized')) return { error: 'Only the traveller can release this payment.' };
    return { error: error.message };
  }

  if (!data) return { error: 'Payment has already been processed or does not exist.' };
  return { error: null };
}

export async function refundPayment(paymentId: string, actorId: string) {
  if (!FeatureFlags.payments) return { error: disabledFeatureMessage.payments };
  if (!actorId) return { error: 'Authentication required' };

  const sb = getSupabaseClient();

  const { data, error } = await sb.rpc('refund_payment_atomic', {
    p_payment_id: paymentId,
    p_actor_id: actorId,
  });

  if (error) {
    if (error.message.includes('not found')) return { error: 'Payment not found or already processed.' };
    if (error.message.includes('unauthorized')) return { error: 'Only the sender can refund this payment.' };
    return { error: error.message };
  }

  if (!data) return { error: 'Payment has already been processed or does not exist.' };
  return { error: null };
}
