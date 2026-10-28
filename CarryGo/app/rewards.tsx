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
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import {
  COIN_TO_RUPEE_CONVERSION_RATE,
  CoinTransaction,
  UserCoinSummary,
  coinsToRupees,
  getCoinTransactions,
  getUserCoinSummary,
  redeemSenderCoinsForCredit,
} from '@/services/rewards.service';
import { useAlert } from '@/template';

const REDEEM_OPTIONS = [10, 50, 100, 200, 500];

export default function RewardsScreen() {
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<UserCoinSummary>({
    balance: 0,
    totalEarned: 0,
    totalRedeemed: 0,
    rupeeValue: 0,
  });
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCoins, setSelectedCoins] = useState<number>(50);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const loadData = useCallback(async () => {
    const [summaryRes, txRes] = await Promise.all([
      getUserCoinSummary(),
      getCoinTransactions(30),
    ]);

    setSummary(summaryRes.data);
    setTransactions(txRes.data);
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

  const handleRedeem = async () => {
    if (summary.balance < selectedCoins) {
      showAlert(
        'Insufficient Coins',
        `You currently have ${summary.balance} coins. You need ${selectedCoins} coins to redeem this amount.`
      );
      return;
    }

    setIsRedeeming(true);
    const result = await redeemSenderCoinsForCredit(selectedCoins);
    setIsRedeeming(false);

    if (result.success) {
      setModalVisible(false);
      showAlert(
        'Redemption Successful!',
        `Successfully redeemed ${result.coinsRedeemed} coins for ₹${result.rupeeCredit?.toFixed(2)} in parcel sending credit!`
      );
      loadData();
    } else {
      showAlert(
        'Redemption Failed',
        result.error || 'Could not complete redemption. Please try again.'
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.surfaceBorder }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: C.surfaceElevated }]}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Coins & Rewards</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Balance Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.coinBadge}>
            <MaterialIcons name="monetization-on" size={32} color="#F59E0B" />
          </View>
          <Text style={[styles.coinBalanceText, { color: C.textPrimary }]}>
            {summary.balance.toLocaleString()} Coins
          </Text>
          <Text style={[styles.rupeeValueText, { color: C.primary }]}>
            ≈ ₹{summary.rupeeValue.toFixed(2)} Parcel Sending Credit
          </Text>
          <Text style={[styles.conversionFormulaText, { color: C.textMuted }]}>
            Conversion rate: {COIN_TO_RUPEE_CONVERSION_RATE} Coins = ₹1.00 (₹0.10/coin)
          </Text>

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
          </View>

          {/* Senders: Action Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Redeem coins for credit"
            onPress={() => setModalVisible(true)}
            style={({ pressed }) => [
              styles.redeemButton,
              { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <MaterialIcons name="redeem" size={18} color="#FFFFFF" />
            <Text style={styles.redeemButtonText}>Redeem for Parcel Credit</Text>
          </Pressable>
        </View>

        {/* How It Works Explainer */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="auto-awesome" size={20} color={C.primary} />
            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>How Rewards Work</Text>
          </View>

          <View style={styles.ruleItem}>
            <MaterialIcons name="flight-takeoff" size={18} color={C.primary} />
            <View style={styles.ruleContent}>
              <Text style={[styles.ruleTitle, { color: C.textPrimary }]}>For Travelers</Text>
              <Text style={[styles.ruleBody, { color: C.textSecondary }]}>
                Complete scheduled parcel deliveries verified with the recipient delivery OTP to automatically earn coins.
              </Text>
            </View>
          </View>

          <View style={styles.ruleItem}>
            <MaterialIcons name="local-shipping" size={18} color={C.primary} />
            <View style={styles.ruleContent}>
              <Text style={[styles.ruleTitle, { color: C.textPrimary }]}>For Senders</Text>
              <Text style={[styles.ruleBody, { color: C.textSecondary }]}>
                Send parcels responsibly. Earn coins automatically when your parcel is successfully delivered.
              </Text>
            </View>
          </View>

          <View style={styles.ruleItem}>
            <MaterialIcons name="currency-rupee" size={18} color={C.primary} />
            <View style={styles.ruleContent}>
              <Text style={[styles.ruleTitle, { color: C.textPrimary }]}>Sender Parcel Credit</Text>
              <Text style={[styles.ruleBody, { color: C.textSecondary }]}>
                Redeem coins directly at a fixed 10 coins = ₹1 rate to reduce your shipping fees.
              </Text>
            </View>
          </View>
        </View>

        {/* Partner Coupons Status Card */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="local-offer" size={20} color="#F59E0B" />
            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Coupons & Vouchers</Text>
          </View>
          <Text style={[styles.cardNotice, { color: C.textSecondary }]}>
            Partner brand coupons and travel vouchers are currently in development. Third-party provider integration will be enabled following commercial catalog approval.
          </Text>
          <View style={[styles.comingSoonTag, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="schedule" size={14} color={C.primary} />
            <Text style={[styles.comingSoonText, { color: C.primary }]}>
              Partner Catalog Coming Soon
            </Text>
          </View>
        </View>

        {/* Transaction History Ledger */}
        <View style={styles.ledgerSection}>
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Transaction History</Text>

          {loading ? (
            <ActivityIndicator size="small" color={C.primary} style={{ marginTop: Spacing.md }} />
          ) : transactions.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="receipt-long" size={32} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No Coin Activity Yet</Text>
              <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
                Complete successful parcel handovers to start earning CarryGo coins!
              </Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const isCredit = tx.amount > 0;
              return (
                <View
                  key={tx.id}
                  style={[styles.txItem, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}
                >
                  <View
                    style={[
                      styles.txIconWrap,
                      { backgroundColor: isCredit ? C.success + '1A' : C.warning + '1A' },
                    ]}
                  >
                    <MaterialIcons
                      name={isCredit ? 'arrow-downward' : 'arrow-upward'}
                      size={18}
                      color={isCredit ? C.success : C.warning}
                    />
                  </View>
                  <View style={styles.txContent}>
                    <Text style={[styles.txDescription, { color: C.textPrimary }]}>
                      {tx.description}
                    </Text>
                    <Text style={[styles.txDate, { color: C.textMuted }]}>
                      {new Date(tx.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
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

      {/* Redemption Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                Redeem for Parcel Credit
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close modal"
                onPress={() => setModalVisible(false)}
                hitSlop={8}
              >
                <MaterialIcons name="close" size={22} color={C.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { color: C.textSecondary }]}>
              Convert your coins into discount credit applied toward parcel sending charges (10 Coins = ₹1).
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
                    onPress={() => setSelectedCoins(coins)}
                    style={[
                      styles.optionChip,
                      {
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                        backgroundColor: isSelected ? C.primarySubtle : C.surfaceElevated,
                        opacity: disabled ? 0.4 : 1,
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
                {selectedCoins} Coins will be deducted from your account.
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
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  headerSpacer: { width: 40 },
  content: { padding: Spacing.md, gap: Spacing.md },
  heroCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  coinBadge: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  coinBalanceText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  rupeeValueText: {
    fontSize: FontSize.md,
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
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  cardNotice: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  comingSoonTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  comingSoonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  ruleContent: {
    flex: 1,
    gap: 2,
  },
  ruleTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  ruleBody: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  ledgerSection: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
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
});
