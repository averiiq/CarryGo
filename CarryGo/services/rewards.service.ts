import { getSupabaseClient } from '@/template';
import { storageGet, storageSet } from '@/lib/secure-storage';

export const COIN_TO_RUPEE_CONVERSION_RATE = 10; // 10 coins = ₹1.00 (₹0.10 per coin)
export const DELIVERY_COIN_AWARD = 50; // 50 coins per completed parcel delivery
export const DAILY_BONUS_COINS = 10; // 10 coins daily check-in bonus

export interface UserCoinSummary {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  rupeeValue: number;
  availableCredit?: number; // Accumulated parcel shipping discount in INR
}

export type CoinTransactionType =
  | 'delivery_reward'
  | 'parcel_credit_redemption'
  | 'coupon_redemption'
  | 'daily_bonus'
  | 'welcome_bonus'
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

export interface CaryGooVoucher {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  coinCost: number;
  discountValue: string;
  minOrder: number;
  isUnlocked: boolean;
  category: 'delivery' | 'express' | 'protection';
}

export const CARYGOO_CATALOG_VOUCHERS: CaryGooVoucher[] = [
  {
    id: 'voucher_fly50',
    code: 'CARYGOO50',
    title: '₹50 OFF Deliveries',
    subtitle: 'Flat ₹50 off any parcel delivery booking over ₹200',
    coinCost: 100,
    discountValue: '₹50 OFF',
    minOrder: 200,
    isUnlocked: false,
    category: 'delivery',
  },
  {
    id: 'voucher_save25',
    code: 'CARYGOO25',
    title: 'Flat ₹25 Direct Off',
    subtitle: 'Instant ₹25 shipping credit discount on any booking',
    coinCost: 50,
    discountValue: '₹25 OFF',
    minOrder: 100,
    isUnlocked: false,
    category: 'delivery',
  },
  {
    id: 'voucher_shield',
    code: 'CGPROTECT',
    title: 'Free CaryGoo Shield Cover',
    subtitle: '100% loss/damage insurance cover on verified delivery handover',
    coinCost: 80,
    discountValue: 'FREE COVER',
    minOrder: 100,
    isUnlocked: false,
    category: 'protection',
  },
  {
    id: 'voucher_express100',
    code: 'EXPRESS100',
    title: '₹100 OFF Flight Express',
    subtitle: 'Exclusive discount on same-day flight corridor deliveries over ₹400',
    coinCost: 250,
    discountValue: '₹100 OFF',
    minOrder: 400,
    isUnlocked: false,
    category: 'express',
  },
];

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
    availableCredit: 0,
  };

  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      return { data: defaultSummary, error: 'Authentication required' };
    }

    const userId = session.user.id;
    const creditKey = `@carrygo_parcel_credit_${userId}`;
    const cachedCredit = (await storageGet<number>(creditKey)) || 0;

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
        availableCredit: cachedCredit,
      };

      // Cache locally for instant UI renders
      await storageSet(`@carrygo_coin_summary_${userId}`, summary);
      return { data: summary, error: null };
    }

    // Fallback to direct table query if RPC is temporarily unavailable
    const { data: balanceRow } = await (sb as any)
      .from('user_coin_balances')
      .select('balance, total_earned, total_redeemed')
      .eq('user_id', userId)
      .maybeSingle();

    if (balanceRow) {
      const balance = Number(balanceRow.balance) || 0;
      const summary: UserCoinSummary = {
        balance,
        totalEarned: Number(balanceRow.total_earned) || 0,
        totalRedeemed: Number(balanceRow.total_redeemed) || 0,
        rupeeValue: coinsToRupees(balance),
        availableCredit: cachedCredit,
      };
      await storageSet(`@carrygo_coin_summary_${userId}`, summary);
      return { data: summary, error: null };
    }

    // Check cached local value
    const cached = await storageGet<UserCoinSummary>(`@carrygo_coin_summary_${userId}`);
    if (cached) {
      return {
        data: {
          ...cached,
          availableCredit: cachedCredit,
        },
        error: null,
      };
    }

    return {
      data: {
        ...defaultSummary,
        availableCredit: cachedCredit,
      },
      error: null,
    };
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

    const userId = session.user.id;
    const { data, error } = await (sb as any)
      .from('coin_transactions')
      .select('id, user_id, transaction_type, amount, balance_after, reference_id, reference_type, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Fallback to local transactions storage if remote query failed
      const cachedTxs = (await storageGet<CoinTransaction[]>(`@carrygo_coin_transactions_${userId}`)) || [];
      return { data: cachedTxs.slice(0, limit), error: null };
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

    // Cache locally for offline availability
    await storageSet(`@carrygo_coin_transactions_${userId}`, mapped);

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Failed to load coin history' };
  }
}

/**
 * Internal helper to prepend a local transaction to the cached ledger.
 */
async function recordLocalTransaction(userId: string, tx: CoinTransaction): Promise<void> {
  const key = `@carrygo_coin_transactions_${userId}`;
  const existing = (await storageGet<CoinTransaction[]>(key)) || [];
  const updated = [tx, ...existing.filter((t) => t.id !== tx.id)].slice(0, 50);
  await storageSet(key, updated);
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

    const userId = session.user.id;

    // Attempt RPC call
    const { data, error } = await (sb.rpc as any)('redeem_sender_coins_for_credit', {
      p_coins: coins,
      p_request_id: requestId ?? null,
    });

    if (!error && data?.success) {
      const coinsRedeemed = Number(data.coins_redeemed);
      const rupeeCredit = Number(data.rupee_credit);
      const newBalance = Number(data.new_balance);

      // Increment available parcel credit in local storage
      const creditKey = `@carrygo_parcel_credit_${userId}`;
      const currentCredit = (await storageGet<number>(creditKey)) || 0;
      await storageSet(creditKey, currentCredit + rupeeCredit);

      // Update cached summary
      const cachedSummary = await storageGet<UserCoinSummary>(`@carrygo_coin_summary_${userId}`);
      if (cachedSummary) {
        await storageSet(`@carrygo_coin_summary_${userId}`, {
          ...cachedSummary,
          balance: newBalance,
          totalRedeemed: cachedSummary.totalRedeemed + coinsRedeemed,
          rupeeValue: coinsToRupees(newBalance),
          availableCredit: currentCredit + rupeeCredit,
        });
      }

      return {
        success: true,
        coinsRedeemed,
        rupeeCredit,
        newBalance,
        error: null,
      };
    }

    // If backend explicitly rejected due to balance or validation, return the message
    if (error && (error.message.includes('Insufficient') || error.message.includes('multiple') || error.message.includes('Minimum'))) {
      return { success: false, error: error.message };
    }

    if (data && !data.success && data.error) {
      return { success: false, error: data.error };
    }

    // Fallback: If RPC was unavailable or offline, check local balance and process redemption safely
    const currentSummaryRes = await getUserCoinSummary();
    const currentSummary = currentSummaryRes.data;

    if (currentSummary.balance < coins) {
      return {
        success: false,
        error: `Insufficient coin balance. You have ${currentSummary.balance} coins, attempted to redeem ${coins} coins.`,
      };
    }

    const rupeeCredit = coinsToRupees(coins);
    const newBalance = currentSummary.balance - coins;

    // Update local credit
    const creditKey = `@carrygo_parcel_credit_${userId}`;
    const currentCredit = (await storageGet<number>(creditKey)) || 0;
    const newCredit = currentCredit + rupeeCredit;
    await storageSet(creditKey, newCredit);

    // Update cached summary
    const updatedSummary: UserCoinSummary = {
      balance: newBalance,
      totalEarned: currentSummary.totalEarned,
      totalRedeemed: currentSummary.totalRedeemed + coins,
      rupeeValue: coinsToRupees(newBalance),
      availableCredit: newCredit,
    };
    await storageSet(`@carrygo_coin_summary_${userId}`, updatedSummary);

    // Record local transaction
    const tx: CoinTransaction = {
      id: `redemption_${Date.now()}`,
      userId,
      transactionType: 'parcel_credit_redemption',
      amount: -coins,
      balanceAfter: newBalance,
      referenceId: requestId ?? null,
      referenceType: requestId ? 'request' : 'credit',
      description: `Redeemed ${coins} coins for ₹${rupeeCredit.toFixed(2)} parcel sending credit`,
      createdAt: new Date().toISOString(),
    };
    await recordLocalTransaction(userId, tx);

    return {
      success: true,
      coinsRedeemed: coins,
      rupeeCredit,
      newBalance,
      error: null,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Redemption request failed' };
  }
}

/**
 * Checks if the current user can claim today's daily coin bonus.
 */
export async function checkDailyBonusStatus(): Promise<{
  canClaim: boolean;
  lastClaimDate?: string;
}> {
  const sb = getSupabaseClient();
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      return { canClaim: false };
    }

    const userId = session.user.id;
    const lastClaimDate = await storageGet<string>(`@carrygo_last_daily_bonus_${userId}`);
    const today = new Date().toISOString().slice(0, 10);

    if (lastClaimDate === today) {
      return { canClaim: false, lastClaimDate };
    }

    return { canClaim: true, lastClaimDate: lastClaimDate || undefined };
  } catch {
    return { canClaim: false };
  }
}

/**
 * Claims the daily CaryGoo check-in reward (+10 Coins once per day).
 */
export async function claimDailyBonus(): Promise<{
  success: boolean;
  coinsAwarded?: number;
  newBalance?: number;
  alreadyClaimed?: boolean;
  error?: string | null;
}> {
  const sb = getSupabaseClient();
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    const userId = session.user.id;
    const today = new Date().toISOString().slice(0, 10);
    const lastClaimDate = await storageGet<string>(`@carrygo_last_daily_bonus_${userId}`);

    if (lastClaimDate === today) {
      return {
        success: false,
        alreadyClaimed: true,
        error: "You have already claimed today's daily reward! Check back tomorrow.",
      };
    }

    const awardAmount = DAILY_BONUS_COINS;
    const summaryRes = await getUserCoinSummary();
    const currentSummary = summaryRes.data;
    const newBalance = currentSummary.balance + awardAmount;

    // Update summary in cache
    const updatedSummary: UserCoinSummary = {
      balance: newBalance,
      totalEarned: currentSummary.totalEarned + awardAmount,
      totalRedeemed: currentSummary.totalRedeemed,
      rupeeValue: coinsToRupees(newBalance),
      availableCredit: currentSummary.availableCredit || 0,
    };
    await storageSet(`@carrygo_coin_summary_${userId}`, updatedSummary);

    // Save claim date
    await storageSet(`@carrygo_last_daily_bonus_${userId}`, today);

    // Record transaction
    const tx: CoinTransaction = {
      id: `daily_${Date.now()}`,
      userId,
      transactionType: 'daily_bonus',
      amount: awardAmount,
      balanceAfter: newBalance,
      referenceId: today,
      referenceType: 'daily_reward',
      description: `Daily check-in reward (+${awardAmount} Coins)`,
      createdAt: new Date().toISOString(),
    };
    await recordLocalTransaction(userId, tx);

    return {
      success: true,
      coinsAwarded: awardAmount,
      newBalance,
      error: null,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to claim daily reward.' };
  }
}

/**
 * Awards coins to user for completing a parcel delivery.
 */
export async function awardDeliveryCoins(
  deliveryId: string,
  amount: number = DELIVERY_COIN_AWARD
): Promise<{
  success: boolean;
  coinsAwarded?: number;
  error?: string | null;
}> {
  const sb = getSupabaseClient();
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    const userId = session.user.id;

    // Try calling Supabase RPC award_delivery_coins
    const { data, error } = await (sb.rpc as any)('award_delivery_coins', {
      p_delivery_id: deliveryId,
    });

    if (!error && data?.success) {
      // Refresh local summary
      await getUserCoinSummary();
      return { success: true, coinsAwarded: Number(data.coins_per_user) || amount };
    }

    // Local fallback award if RPC not deployed or offline
    const summaryRes = await getUserCoinSummary();
    const currentSummary = summaryRes.data;
    const newBalance = currentSummary.balance + amount;

    const updatedSummary: UserCoinSummary = {
      balance: newBalance,
      totalEarned: currentSummary.totalEarned + amount,
      totalRedeemed: currentSummary.totalRedeemed,
      rupeeValue: coinsToRupees(newBalance),
      availableCredit: currentSummary.availableCredit || 0,
    };
    await storageSet(`@carrygo_coin_summary_${userId}`, updatedSummary);

    const tx: CoinTransaction = {
      id: `deliv_${Date.now()}`,
      userId,
      transactionType: 'delivery_reward',
      amount,
      balanceAfter: newBalance,
      referenceId: deliveryId,
      referenceType: 'delivery',
      description: `Delivery reward for completed parcel handover #${deliveryId.slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    await recordLocalTransaction(userId, tx);

    return { success: true, coinsAwarded: amount, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to award coins' };
  }
}

/**
 * Retrieves the user's available parcel credit (in INR) converted from coins.
 */
export async function getAvailableParcelCredit(): Promise<number> {
  const sb = getSupabaseClient();
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return 0;
    const creditKey = `@carrygo_parcel_credit_${session.user.id}`;
    const credit = await storageGet<number>(creditKey);
    return Number(credit) || 0;
  } catch {
    return 0;
  }
}

/**
 * Applies parcel credit toward an active booking payment, deducting the applied credit.
 */
export async function applyParcelCredit(
  amountToDeduct: number
): Promise<{ success: boolean; remainingCredit: number; deducted: number; error?: string | null }> {
  if (amountToDeduct <= 0) {
    return { success: false, remainingCredit: 0, deducted: 0, error: 'Invalid deduction amount.' };
  }

  const sb = getSupabaseClient();
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      return { success: false, remainingCredit: 0, deducted: 0, error: 'Authentication required' };
    }

    const creditKey = `@carrygo_parcel_credit_${session.user.id}`;
    const currentCredit = (await storageGet<number>(creditKey)) || 0;

    if (currentCredit <= 0) {
      return { success: false, remainingCredit: 0, deducted: 0, error: 'No parcel credit available.' };
    }

    const deducted = Math.min(currentCredit, amountToDeduct);
    const remainingCredit = Number((currentCredit - deducted).toFixed(2));
    await storageSet(creditKey, remainingCredit);

    // Update summary cached credit
    const cachedSummary = await storageGet<UserCoinSummary>(`@carrygo_coin_summary_${session.user.id}`);
    if (cachedSummary) {
      await storageSet(`@carrygo_coin_summary_${session.user.id}`, {
        ...cachedSummary,
        availableCredit: remainingCredit,
      });
    }

    return { success: true, remainingCredit, deducted, error: null };
  } catch (err: any) {
    return { success: false, remainingCredit: 0, deducted: 0, error: err?.message };
  }
}

/**
 * Retrieves all platform vouchers, marking which ones are unlocked by the current user.
 */
export async function getAvailableVouchers(): Promise<CaryGooVoucher[]> {
  const sb = getSupabaseClient();
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      return CARYGOO_CATALOG_VOUCHERS.map((v) => ({ ...v, isUnlocked: false }));
    }

    const unlockedKey = `@carrygo_unlocked_vouchers_${session.user.id}`;
    const unlockedIds = (await storageGet<string[]>(unlockedKey)) || [];

    return CARYGOO_CATALOG_VOUCHERS.map((v) => ({
      ...v,
      isUnlocked: unlockedIds.includes(v.id),
    }));
  } catch {
    return CARYGOO_CATALOG_VOUCHERS.map((v) => ({ ...v, isUnlocked: false }));
  }
}

/**
 * Unlocks a CaryGoo voucher using the user's earned coins.
 */
export async function unlockVoucher(
  voucherId: string
): Promise<{ success: boolean; voucher?: CaryGooVoucher; error?: string | null }> {
  const voucher = CARYGOO_CATALOG_VOUCHERS.find((v) => v.id === voucherId);
  if (!voucher) {
    return { success: false, error: 'Voucher not found in catalog.' };
  }

  const sb = getSupabaseClient();
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    const userId = session.user.id;
    const unlockedKey = `@carrygo_unlocked_vouchers_${userId}`;
    const unlockedIds = (await storageGet<string[]>(unlockedKey)) || [];

    if (unlockedIds.includes(voucherId)) {
      return { success: true, voucher: { ...voucher, isUnlocked: true } };
    }

    const summaryRes = await getUserCoinSummary();
    const currentSummary = summaryRes.data;

    if (currentSummary.balance < voucher.coinCost) {
      return {
        success: false,
        error: `Insufficient coins. You have ${currentSummary.balance} coins, but this voucher requires ${voucher.coinCost} coins.`,
      };
    }

    const newBalance = currentSummary.balance - voucher.coinCost;
    const updatedSummary: UserCoinSummary = {
      balance: newBalance,
      totalEarned: currentSummary.totalEarned,
      totalRedeemed: currentSummary.totalRedeemed + voucher.coinCost,
      rupeeValue: coinsToRupees(newBalance),
      availableCredit: currentSummary.availableCredit || 0,
    };
    await storageSet(`@carrygo_coin_summary_${userId}`, updatedSummary);

    // Save unlocked voucher ID
    await storageSet(unlockedKey, [...unlockedIds, voucherId]);

    // Record transaction
    const tx: CoinTransaction = {
      id: `voucher_${Date.now()}`,
      userId,
      transactionType: 'coupon_redemption',
      amount: -voucher.coinCost,
      balanceAfter: newBalance,
      referenceId: voucher.code,
      referenceType: 'voucher',
      description: `Unlocked voucher ${voucher.code} (${voucher.discountValue})`,
      createdAt: new Date().toISOString(),
    };
    await recordLocalTransaction(userId, tx);

    return {
      success: true,
      voucher: { ...voucher, isUnlocked: true },
      error: null,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to unlock voucher.' };
  }
}
