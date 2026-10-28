import { getSupabaseClient } from '@/template';
import { storageGet, storageSet } from '@/lib/secure-storage';

export const COIN_TO_RUPEE_CONVERSION_RATE = 10; // 10 coins = ₹1.00 (₹0.10 per coin)

export interface UserCoinSummary {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  rupeeValue: number;
}

export type CoinTransactionType =
  | 'delivery_reward'
  | 'parcel_credit_redemption'
  | 'coupon_redemption'
  | 'admin_adjustment';

export interface CoinTransaction {
  id: string;
  userId: string;
  transactionType: CoinTransactionType;
  amount: number;
  balanceAfter: number;
  referenceId?: string | null;
  referenceType?: string | null;
  description: string;
  createdAt: string;
}

/**
 * Converts coins to INR (10 coins = ₹1.00).
 * Rounds to 2 decimal places.
 */
export function coinsToRupees(coins: number): number {
  if (!Number.isFinite(coins) || coins <= 0) return 0;
  return Number((coins / COIN_TO_RUPEE_CONVERSION_RATE).toFixed(2));
}

/**
 * Converts INR to required coins (₹1.00 = 10 coins).
 */
export function rupeesToCoins(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees <= 0) return 0;
  return Math.round(rupees * COIN_TO_RUPEE_CONVERSION_RATE);
}

/**
 * Fetches the user's current coin balance and summary.
 */
export async function getUserCoinSummary(): Promise<{
  data: UserCoinSummary;
  error: string | null;
}> {
  const sb = getSupabaseClient();
  const defaultSummary: UserCoinSummary = {
    balance: 0,
    totalEarned: 0,
    totalRedeemed: 0,
    rupeeValue: 0,
  };

  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      return { data: defaultSummary, error: 'Authentication required' };
    }

    // Call get_user_coin_summary RPC
    const { data, error } = await (sb.rpc as any)('get_user_coin_summary');
    if (!error && data) {
      const balance = Number(data.balance) || 0;
      const totalEarned = Number(data.total_earned) || 0;
      const totalRedeemed = Number(data.total_redeemed) || 0;
      const rupeeValue = Number(data.rupee_value) || coinsToRupees(balance);

      const summary: UserCoinSummary = {
        balance,
        totalEarned,
        totalRedeemed,
        rupeeValue,
      };

      // Cache locally for instant UI renders
      await storageSet(`@carrygo_coin_summary_${session.user.id}`, summary);
      return { data: summary, error: null };
    }

    // Fallback to direct table query if RPC is temporarily unavailable
    const { data: balanceRow } = await (sb as any)
      .from('user_coin_balances')
      .select('balance, total_earned, total_redeemed')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (balanceRow) {
      const balance = Number(balanceRow.balance) || 0;
      const summary: UserCoinSummary = {
        balance,
        totalEarned: Number(balanceRow.total_earned) || 0,
        totalRedeemed: Number(balanceRow.total_redeemed) || 0,
        rupeeValue: coinsToRupees(balance),
      };
      return { data: summary, error: null };
    }

    // Check cached local value
    const cached = await storageGet<UserCoinSummary>(`@carrygo_coin_summary_${session.user.id}`);
    if (cached) {
      return { data: cached, error: null };
    }

    return { data: defaultSummary, error: null };
  } catch (err: any) {
    return { data: defaultSummary, error: err?.message || 'Failed to load coin summary' };
  }
}

/**
 * Fetches the user's coin transaction history ledger.
 */
export async function getCoinTransactions(
  limit: number = 30
): Promise<{ data: CoinTransaction[]; error: string | null }> {
  const sb = getSupabaseClient();
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      return { data: [], error: 'Authentication required' };
    }

    const { data, error } = await (sb as any)
      .from('coin_transactions')
      .select('id, user_id, transaction_type, amount, balance_after, reference_id, reference_type, description, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: error.message };
    }

    const mapped: CoinTransaction[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      transactionType: row.transaction_type,
      amount: Number(row.amount),
      balanceAfter: Number(row.balance_after),
      referenceId: row.reference_id,
      referenceType: row.reference_type,
      description: row.description,
      createdAt: row.created_at,
    }));

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Failed to load coin history' };
  }
}

/**
 * Redeems sender coins for parcel-sending discount credit at 10 coins = ₹1.
 */
export async function redeemSenderCoinsForCredit(
  coins: number,
  requestId?: string
): Promise<{
  success: boolean;
  coinsRedeemed?: number;
  rupeeCredit?: number;
  newBalance?: number;
  error?: string | null;
}> {
  if (!Number.isInteger(coins) || coins < 10) {
    return { success: false, error: 'Minimum redemption is 10 coins (10 coins = ₹1).' };
  }

  if (coins % 10 !== 0) {
    return { success: false, error: 'Coins must be redeemed in multiples of 10.' };
  }

  const sb = getSupabaseClient();
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    const { data, error } = await (sb.rpc as any)('redeem_sender_coins_for_credit', {
      p_coins: coins,
      p_request_id: requestId ?? null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.success) {
      return {
        success: true,
        coinsRedeemed: Number(data.coins_redeemed),
        rupeeCredit: Number(data.rupee_credit),
        newBalance: Number(data.new_balance),
        error: null,
      };
    }

    return { success: false, error: data?.error || 'Redemption failed' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Redemption request failed' };
  }
}
