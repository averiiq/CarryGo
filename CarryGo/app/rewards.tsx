import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing, TouchTarget } from '@/constants/theme';
import {
  COIN_TO_RUPEE_CONVERSION_RATE,
  CoinTransaction,
  UserCoinSummary,
  CaryGooVoucher,
  coinsToRupees,
  getCoinTransactions,
  getUserCoinSummary,
  redeemSenderCoinsForCredit,
  checkDailyBonusStatus,
  claimDailyBonus,
  getAvailableVouchers,
  unlockVoucher,
} from '@/services/rewards.service';
import { useAlert } from '@/template';
import { Haptic } from '@/services/haptics.service';
import { useResponsive } from '@/hooks/useResponsive';

const REDEEM_OPTIONS = [10, 50, 100, 200, 500];

type FilterTab = 'all' | 'earned' | 'redeemed';

export default function RewardsScreen() {
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { isSmallDevice, isTablet } = useResponsive();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<UserCoinSummary>({
    balance: 0,
    totalEarned: 0,
    totalRedeemed: 0,
    rupeeValue: 0,
    availableCredit: 0,
  });
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [vouchers, setVouchers] = useState<CaryGooVoucher[]>([]);
  const [canClaimDaily, setCanClaimDaily] = useState(false);
  const [isClaimingDaily, setIsClaimingDaily] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedCoins, setSelectedCoins] = useState<number>(50);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [unlockingVoucherId, setUnlockingVoucherId] = useState<string | null>(null);
  const [copiedVoucherId, setCopiedVoucherId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const loadData = useCallback(async () => {
    const [summaryRes, txRes, voucherList, dailyStatus] = await Promise.all([
      getUserCoinSummary(),
      getCoinTransactions(50),
      getAvailableVouchers(),
      checkDailyBonusStatus(),
    ]);

    setSummary(summaryRes.data);
    setTransactions(txRes.data);
    setVouchers(voucherList);
    setCanClaimDaily(dailyStatus.canClaim);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleClaimDailyBonus = async () => {
    if (!canClaimDaily || isClaimingDaily) return;
    Haptic.select();
    setIsClaimingDaily(true);

    const result = await claimDailyBonus();
    setIsClaimingDaily(false);

    if (result.success) {
      Haptic.success();
      showAlert(
        'Daily Reward Claimed!',
        `+${result.coinsAwarded} Coins have been added to your CaryGoo balance!`
      );
      loadData();
    } else {
      Haptic.warning();
      showAlert('Reward Status', result.error || "You've already claimed your daily reward today.");
      setCanClaimDaily(false);
    }
  };

  const handleRedeem = async () => {
    if (summary.balance < selectedCoins) {
      Haptic.warning();
      showAlert(
        'Insufficient Coins',
        `You currently have ${summary.balance} coins. You need ${selectedCoins} coins to redeem this amount.`
      );
      return;
    }

    Haptic.select();
    setIsRedeeming(true);
    const result = await redeemSenderCoinsForCredit(selectedCoins);
    setIsRedeeming(false);

    if (result.success) {
      Haptic.success();
      setModalVisible(false);
      showAlert(
        'Redemption Successful!',
        `Successfully converted ${result.coinsRedeemed} coins into ₹${result.rupeeCredit?.toFixed(2)} in parcel sending credit! Your credit will automatically discount your next booking.`
      );
      loadData();
    } else {
      Haptic.warning();
      showAlert(
        'Redemption Failed',
        result.error || 'Could not complete redemption. Please try again.'
      );
    }
  };

  const handleUnlockVoucher = async (voucher: CaryGooVoucher) => {
    if (summary.balance < voucher.coinCost) {
      Haptic.warning();
      showAlert(
        'Need More Coins',
        `This voucher requires ${voucher.coinCost} coins. Your current balance is ${summary.balance} coins.`
      );
      return;
    }

    Haptic.select();
    setUnlockingVoucherId(voucher.id);
    const result = await unlockVoucher(voucher.id);
    setUnlockingVoucherId(null);

    if (result.success) {
      Haptic.success();
      showAlert(
        'Voucher Unlocked!',
        `Coupon code ${voucher.code} is now unlocked! Copy it below to apply it on your next delivery booking.`
      );
      loadData();
    } else {
      Haptic.warning();
      showAlert('Unlock Failed', result.error || 'Could not unlock voucher.');
    }
  };

  const handleCopyVoucher = async (voucher: CaryGooVoucher) => {
    Haptic.select();
    await Clipboard.setStringAsync(voucher.code);
    setCopiedVoucherId(voucher.id);
    setTimeout(() => {
      setCopiedVoucherId((prev) => (prev === voucher.id ? null : prev));
    }, 2500);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === 'earned') return tx.amount > 0;
    if (activeTab === 'redeemed') return tx.amount < 0;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* ── Top Pinned Header ────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }, isTablet && styles.tabletCentered]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            Haptic.tap();
            router.back();
          }}
          style={[styles.backButton, { backgroundColor: C.surfaceElevated }]}
          hitSlop={TouchTarget.smallHitSlop}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Coins & Rewards</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>CaryGoo Loyalty & Savings</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Rewards information"
          onPress={() => {
            Haptic.tap();
            setInfoModalVisible(true);
          }}
          style={[styles.infoButton, { backgroundColor: C.surfaceElevated }]}
          hitSlop={TouchTarget.smallHitSlop}
        >
          <MaterialIcons name="info-outline" size={20} color={C.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xxl },
          isTablet && styles.tabletCentered,
          isSmallDevice && { paddingHorizontal: Spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {/* ── Hero Balance Card ─────────────────────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.coinBadgeContainer}>
            <View style={styles.coinBadge}>
              <MaterialIcons name="monetization-on" size={36} color="#F59E0B" />
            </View>
            <View style={[styles.rateBadge, { backgroundColor: C.primarySubtle }]}>
              <Text style={[styles.rateBadgeText, { color: C.primary }]}>
                {COIN_TO_RUPEE_CONVERSION_RATE} Coins = ₹1.00
              </Text>
            </View>
          </View>

          <Text style={[styles.coinBalanceText, { color: C.textPrimary }]}>
            {summary.balance.toLocaleString()} Coins
          </Text>

          <Text style={[styles.rupeeValueText, { color: C.success }]}>
            ≈ ₹{summary.rupeeValue.toFixed(2)} Parcel Sending Value
          </Text>

          <Text style={[styles.conversionFormulaText, { color: C.textMuted }]}>
            Fixed guaranteed conversion: ₹0.10 value per CaryGoo coin
          </Text>

          {/* Quick Metrics Bar */}
          <View style={[styles.statsRow, { borderTopColor: C.surfaceBorder }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Total Earned</Text>
              <Text style={[styles.statValue, { color: C.success }]}>
                +{summary.totalEarned.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: C.surfaceBorder }]} />

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Total Redeemed</Text>
              <Text style={[styles.statValue, { color: C.warning }]}>
                {summary.totalRedeemed.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: C.surfaceBorder }]} />

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Active Credit</Text>
              <Text style={[styles.statValue, { color: C.primary }]}>
                ₹{(summary.availableCredit || 0).toFixed(0)}
              </Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.heroActionsRow}>
            {/* Redeem Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Redeem coins for parcel credit"
              onPress={() => {
                Haptic.tap();
                setModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.heroActionButton,
                { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <MaterialIcons name="redeem" size={18} color="#FFFFFF" />
              <Text style={styles.heroActionBtnText}>Redeem for Credit</Text>
            </Pressable>

            {/* Daily Bonus Claim Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Claim daily bonus coins"
              disabled={!canClaimDaily || isClaimingDaily}
              onPress={handleClaimDailyBonus}
              style={({ pressed }) => [
                styles.heroSecondaryButton,
                {
                  borderColor: canClaimDaily ? C.success : C.surfaceBorder,
                  backgroundColor: canClaimDaily ? C.successSubtle : C.surfaceElevated,
                  opacity: pressed ? 0.88 : canClaimDaily ? 1 : 0.65,
                },
              ]}
            >
              {isClaimingDaily ? (
                <ActivityIndicator size="small" color={C.success} />
              ) : (
                <>
                  <MaterialIcons
                    name={canClaimDaily ? 'card-giftcard' : 'check-circle'}
                    size={18}
                    color={canClaimDaily ? C.success : C.textMuted}
                  />
                  <Text
                    style={[
                      styles.heroSecondaryBtnText,
                      { color: canClaimDaily ? C.success : C.textMuted },
                    ]}
                  >
                    {canClaimDaily ? 'Claim Daily +10' : 'Claimed Today'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Active Parcel Credit Highlight ────────────────────────── */}
        {(summary.availableCredit || 0) > 0 ? (
          <View style={[styles.creditBanner, { backgroundColor: C.successSubtle, borderColor: C.success + '40' }]}>
            <View style={[styles.creditIconWrap, { backgroundColor: C.success }]}>
              <MaterialIcons name="account-balance-wallet" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.creditContent}>
              <Text style={[styles.creditTitle, { color: C.textPrimary }]}>
                ₹{(summary.availableCredit || 0).toFixed(2)} Shipping Credit Ready
              </Text>
              <Text style={[styles.creditSubtitle, { color: C.textSecondary }]}>
                Will automatically apply to discount your next parcel delivery checkout.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Book parcel with credit"
              onPress={() => router.push('/create-parcel')}
              style={[styles.creditActionButton, { backgroundColor: C.success }]}
            >
              <Text style={styles.creditActionText}>Send Parcel</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Refer & Earn Banner ─────────────────────────────────── */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open referral and affiliate program"
          onPress={() => {
            Haptic.select();
            router.push('/referral' as never);
          }}
          style={({ pressed }) => [
            styles.referralBanner,
            {
              backgroundColor: C.primarySubtle,
              borderColor: C.primary + '55',
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.referralIconWrap, { backgroundColor: C.primary }]}>
            <MaterialIcons name="card-giftcard" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.referralContent}>
            <View style={styles.referralTitleRow}>
              <Text style={[styles.referralTitle, { color: C.textPrimary }]}>Refer & Earn ₹100</Text>
              <View style={[styles.referralBadge, { backgroundColor: C.primary }]}>
                <Text style={styles.referralBadgeText}>NEW</Text>
              </View>
            </View>
            <Text style={[styles.referralSub, { color: C.textSecondary }]}>
              Invite friends to CaryGoo. Give ₹50 off, get ₹100 credit on their first delivery.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={C.primary} />
        </Pressable>

        {/* ── Unlocked & Available CaryGoo Vouchers ──────────────────── */}
        <View style={[styles.sectionContainer, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="local-offer" size={20} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
                Exclusive CaryGoo Coupons
              </Text>
            </View>
            <Text style={[styles.sectionHeaderBadge, { color: C.primary, backgroundColor: C.primarySubtle }]}>
              Verified Savings
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: C.textSecondary }]}>
            Exchange your earned coins for genuine promotional codes applicable during parcel booking.
          </Text>

          <View style={styles.voucherGrid}>
            {vouchers.map((voucher) => {
              const isUnlocking = unlockingVoucherId === voucher.id;
              const isCopied = copiedVoucherId === voucher.id;
              const canAfford = summary.balance >= voucher.coinCost;

              return (
                <View
                  key={voucher.id}
                  style={[
                    styles.voucherCard,
                    {
                      backgroundColor: C.surfaceElevated,
                      borderColor: voucher.isUnlocked ? C.success : C.surfaceBorder,
                    },
                  ]}
                >
                  <View style={styles.voucherTop}>
                    <View style={styles.voucherTagWrap}>
                      <View
                        style={[
                          styles.voucherCategoryBadge,
                          {
                            backgroundColor:
                              voucher.category === 'express'
                                ? '#8B5CF620'
                                : voucher.category === 'protection'
                                ? C.successSubtle
                                : C.primarySubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.voucherCategoryText,
                            {
                              color:
                                voucher.category === 'express'
                                ? '#8B5CF6'
                                : voucher.category === 'protection'
                                ? C.success
                                : C.primary,
                            },
                          ]}
                        >
                          {voucher.discountValue}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.voucherCost, { color: C.textMuted }]}>
                      {voucher.coinCost} Coins
                    </Text>
                  </View>

                  <Text style={[styles.voucherTitle, { color: C.textPrimary }]}>
                    {voucher.title}
                  </Text>
                  <Text style={[styles.voucherSubtitle, { color: C.textMuted }]}>
                    {voucher.subtitle}
                  </Text>

                  {voucher.isUnlocked ? (
                    <View style={[styles.unlockedBox, { borderColor: C.success }]}>
                      <View style={styles.codeWrap}>
                        <Text style={[styles.codeText, { color: C.textPrimary }]}>
                          {voucher.code}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Copy coupon code ${voucher.code}`}
                        onPress={() => handleCopyVoucher(voucher)}
                        style={[
                          styles.copyButton,
                          { backgroundColor: isCopied ? C.success : C.primary },
                        ]}
                        hitSlop={TouchTarget.smallHitSlop}
                      >
                        <Feather
                          name={isCopied ? 'check' : 'copy'}
                          size={14}
                          color="#FFFFFF"
                        />
                        <Text style={styles.copyButtonText}>
                          {isCopied ? 'Copied' : 'Copy'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Unlock ${voucher.title} for ${voucher.coinCost} coins`}
                      disabled={isUnlocking}
                      onPress={() => handleUnlockVoucher(voucher)}
                      style={({ pressed }) => [
                        styles.unlockButton,
                        {
                          backgroundColor: canAfford ? C.primary : C.surfaceBorder,
                          opacity: pressed ? 0.88 : 1,
                        },
                      ]}
                    >
                      {isUnlocking ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons
                            name="lock-open"
                            size={15}
                            color={canAfford ? '#FFFFFF' : C.textMuted}
                          />
                          <Text
                            style={[
                              styles.unlockButtonText,
                              { color: canAfford ? '#FFFFFF' : C.textMuted },
                            ]}
                          >
                            Unlock ({voucher.coinCost} Coins)
                          </Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── How It Works Explainer ─────────────────────────────────── */}
        <View style={[styles.sectionContainer, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="auto-awesome" size={20} color={C.primary} />
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
                How CaryGoo Rewards Work
              </Text>
            </View>
          </View>

          <View style={styles.rulesList}>
            <View style={styles.ruleItem}>
              <View style={[styles.ruleIconWrap, { backgroundColor: C.primarySubtle }]}>
                <MaterialIcons name="flight-takeoff" size={18} color={C.primary} />
              </View>
              <View style={styles.ruleContent}>
                <Text style={[styles.ruleTitle, { color: C.textPrimary }]}>For Travelers</Text>
                <Text style={[styles.ruleBody, { color: C.textSecondary }]}>
                  Earn +50 coins automatically on every completed parcel delivery upon recipient verification PIN handover.
                </Text>
              </View>
            </View>

            <View style={styles.ruleItem}>
              <View style={[styles.ruleIconWrap, { backgroundColor: C.successSubtle }]}>
                <MaterialIcons name="inventory-2" size={18} color={C.success} />
              </View>
              <View style={styles.ruleContent}>
                <Text style={[styles.ruleTitle, { color: C.textPrimary }]}>For Senders</Text>
                <Text style={[styles.ruleBody, { color: C.textSecondary }]}>
                  Send parcels securely. Receive +50 coins automatically when your parcel reaches the recipient.
                </Text>
              </View>
            </View>

            <View style={styles.ruleItem}>
              <View style={[styles.ruleIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <MaterialIcons name="currency-rupee" size={18} color="#D97706" />
              </View>
              <View style={styles.ruleContent}>
                <Text style={[styles.ruleTitle, { color: C.textPrimary }]}>Guaranteed 10 Coins = ₹1</Text>
                <Text style={[styles.ruleBody, { color: C.textSecondary }]}>
                  Convert any multiple of 10 coins directly into instant shipping credits with zero platform lock-in.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Transaction History Ledger ─────────────────────────────── */}
        <View style={styles.ledgerSection}>
          <View style={styles.ledgerHeaderRow}>
            <Text style={[styles.ledgerTitle, { color: C.textPrimary }]}>Activity Ledger</Text>
            <Text style={[styles.ledgerCount, { color: C.textMuted }]}>
              {filteredTransactions.length} records
            </Text>
          </View>

          {/* Filter Tabs */}
          <View style={[styles.tabBar, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            {(['all', 'earned', 'redeemed'] as FilterTab[]).map((tab) => {
              const isSelected = activeTab === tab;
              const label = tab === 'all' ? 'All Activity' : tab === 'earned' ? 'Earned (+)' : 'Redeemed (-)';
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    Haptic.select();
                    setActiveTab(tab);
                  }}
                  style={[
                    styles.tabButton,
                    isSelected && { backgroundColor: C.primarySubtle },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      {
                        color: isSelected ? C.primary : C.textMuted,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.regular,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={C.primary} style={{ marginTop: Spacing.md }} />
          ) : filteredTransactions.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="receipt-long" size={36} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
                {activeTab === 'earned'
                  ? 'No Coins Earned Yet'
                  : activeTab === 'redeemed'
                  ? 'No Coins Redeemed Yet'
                  : 'No Coin Activity Yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
                {canClaimDaily
                  ? 'Tap "Claim Daily +10" above or complete parcel deliveries to start earning!'
                  : 'Complete successful parcel handovers to start earning CaryGoo coins!'}
              </Text>
            </View>
          ) : (
            filteredTransactions.map((tx) => {
              const isCredit = tx.amount > 0;
              return (
                <View
                  key={tx.id}
                  style={[styles.txItem, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}
                >
                  <View
                    style={[
                      styles.txIconWrap,
                      { backgroundColor: isCredit ? C.successSubtle : C.warningSubtle },
                    ]}
                  >
                    <MaterialIcons
                      name={
                        tx.transactionType === 'daily_bonus'
                          ? 'card-giftcard'
                          : tx.transactionType === 'coupon_redemption'
                          ? 'local-offer'
                          : isCredit
                          ? 'arrow-downward'
                          : 'arrow-upward'
                      }
                      size={18}
                      color={isCredit ? C.success : C.warning}
                    />
                  </View>

                  <View style={styles.txContent}>
                    <Text style={[styles.txDescription, { color: C.textPrimary }]} numberOfLines={2}>
                      {tx.description}
                    </Text>
                    <Text style={[styles.txDate, { color: C.textMuted }]}>
                      {new Date(tx.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  <View style={styles.txAmountWrap}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isCredit ? C.success : C.textPrimary },
                      ]}
                    >
                      {isCredit ? `+${tx.amount}` : `${tx.amount}`}
                    </Text>
                    <Text style={[styles.txBalanceAfter, { color: C.textMuted }]}>
                      bal: {tx.balanceAfter}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── Redemption Modal ───────────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                  Redeem for Parcel Credit
                </Text>
                <Text style={[styles.modalBalanceLabel, { color: C.textMuted }]}>
                  Balance: {summary.balance} Coins
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close modal"
                onPress={() => setModalVisible(false)}
                hitSlop={TouchTarget.smallHitSlop}
              >
                <MaterialIcons name="close" size={22} color={C.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { color: C.textSecondary }]}>
              Convert your coins into shipping credit (10 Coins = ₹1). Credit is instantly applied to lower your booking fees.
            </Text>

            <View style={styles.optionsWrap}>
              {REDEEM_OPTIONS.map((coins) => {
                const isSelected = selectedCoins === coins;
                const rupeeVal = coinsToRupees(coins);
                const disabled = summary.balance < coins;
                return (
                  <Pressable
                    key={coins}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      Haptic.select();
                      setSelectedCoins(coins);
                    }}
                    style={[
                      styles.optionChip,
                      {
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                        backgroundColor: isSelected ? C.primarySubtle : C.surfaceElevated,
                        opacity: disabled ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionCoinText,
                        { color: isSelected ? C.primary : C.textPrimary },
                      ]}
                    >
                      {coins} Coins
                    </Text>
                    <Text style={[styles.optionRupeeText, { color: C.textSecondary }]}>
                      ₹{rupeeVal.toFixed(0)} Credit
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.modalSummary, { backgroundColor: C.surfaceElevated }]}>
              <Text style={[styles.modalSummaryLabel, { color: C.textSecondary }]}>You will receive:</Text>
              <Text style={[styles.modalSummaryValue, { color: C.primary }]}>
                ₹{coinsToRupees(selectedCoins).toFixed(2)} Parcel Credit
              </Text>
              <Text style={[styles.modalSummarySub, { color: C.textMuted }]}>
                {selectedCoins} Coins will be deducted. New balance: {Math.max(0, summary.balance - selectedCoins)}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={() => setModalVisible(false)}
                style={[styles.modalCancelButton, { borderColor: C.surfaceBorder }]}
              >
                <Text style={[styles.modalCancelText, { color: C.textSecondary }]}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm Redemption"
                disabled={isRedeeming || summary.balance < selectedCoins}
                onPress={handleRedeem}
                style={[
                  styles.modalConfirmButton,
                  {
                    backgroundColor: C.primary,
                    opacity: isRedeeming || summary.balance < selectedCoins ? 0.5 : 1,
                  },
                ]}
              >
                {isRedeeming ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Redemption</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Information Guide Modal ────────────────────────────────── */}
      <Modal visible={infoModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                Rewards & Loyalty Guide
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close info"
                onPress={() => setInfoModalVisible(false)}
                hitSlop={TouchTarget.smallHitSlop}
              >
                <MaterialIcons name="close" size={22} color={C.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: Spacing.sm }}>
                <Text style={[styles.infoParagraph, { color: C.textSecondary }]}>
                  <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>1. Earning Coins:{'\n'}</Text>
                  Every time a parcel delivery is completed and verified using the recipient delivery code, both the traveler and sender earn 50 CaryGoo coins automatically.
                </Text>

                <Text style={[styles.infoParagraph, { color: C.textSecondary }]}>
                  <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>2. Fixed Rate Conversion:{'\n'}</Text>
                  Coins convert at a fixed 10 Coins = ₹1.00 rate (₹0.10/coin). There are no dynamic or deceptive conversions.
                </Text>

                <Text style={[styles.infoParagraph, { color: C.textSecondary }]}>
                  <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>3. Parcel Sending Credit:{'\n'}</Text>
                  Redeemed coins convert into instant parcel credits that discount future shipping fees.
                </Text>

                <Text style={[styles.infoParagraph, { color: C.textSecondary }]}>
                  <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>4. Vouchers & Coupons:{'\n'}</Text>
                  Unlocked coupons can be copied and applied on bookings matching the minimum order threshold.
                </Text>
              </View>
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Got it"
              onPress={() => setInfoModalVisible(false)}
              style={[styles.modalConfirmButton, { backgroundColor: C.primary, width: '100%' }]}
            >
              <Text style={styles.modalConfirmText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabletCentered: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  headerSub: {
    fontSize: FontSize.xs,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: Spacing.md, gap: Spacing.md },
  heroCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  coinBadgeContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  coinBadge: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  rateBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  coinBalanceText: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  rupeeValueText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  conversionFormulaText: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderTopWidth: 1,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statLabel: {
    fontSize: FontSize.xs,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
    marginTop: Spacing.md,
  },
  heroActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  heroActionBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  heroSecondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  heroSecondaryBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  creditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  referralIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralContent: {
    flex: 1,
    gap: 3,
  },
  referralTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  referralTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  referralBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  referralBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  referralSub: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  creditIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditContent: {
    flex: 1,
    gap: 2,
  },
  creditTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  creditSubtitle: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  creditActionButton: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  creditActionText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  sectionContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  sectionHeaderBadge: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  sectionDesc: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  voucherGrid: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  voucherCard: {
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  voucherTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voucherTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voucherCategoryBadge: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  voucherCategoryText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  voucherCost: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  voucherTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  voucherSubtitle: {
    fontSize: FontSize.xs,
  },
  unlockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingLeft: Spacing.sm,
    paddingRight: 2,
    paddingVertical: 2,
    marginTop: Spacing.xs,
    backgroundColor: 'rgba(0, 139, 72, 0.06)',
  },
  codeWrap: { flex: 1 },
  codeText: {
    fontFamily: 'monospace',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xs,
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs + 3,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  unlockButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  rulesList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  ruleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  ruleContent: {
    flex: 1,
    gap: 2,
  },
  ruleTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  ruleBody: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  ledgerSection: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ledgerTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  ledgerCount: {
    fontSize: FontSize.xs,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabButtonText: {
    fontSize: FontSize.xs,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  emptySubtitle: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  txIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txContent: {
    flex: 1,
    gap: 2,
  },
  txDescription: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  txDate: {
    fontSize: 11,
  },
  txAmountWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txAmount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  txBalanceAfter: {
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderTitleWrap: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  modalBalanceLabel: {
    fontSize: FontSize.xs,
  },
  modalSubtitle: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionChip: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 2,
  },
  optionCoinText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  optionRupeeText: {
    fontSize: FontSize.xs,
  },
  modalSummary: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    gap: 2,
  },
  modalSummaryLabel: {
    fontSize: FontSize.xs,
  },
  modalSummaryValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  modalSummarySub: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  modalConfirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  infoParagraph: {
    fontSize: FontSize.xs,
    lineHeight: 19,
  },
});
