import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAlert } from '@/template';
import { Haptic } from '@/services/haptics.service';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';

export default function ReferralScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { C, isDark } = useThemeColors();
  const { showAlert } = useAlert();
  const { isSmallDevice, isTablet } = useResponsive();

  const [copied, setCopied] = useState(false);

  // Generate a distinct referral code from user id or default fallback
  const referralCode = useMemo(() => {
    if (user?.id) {
      const clean = user.id.replace(/-/g, '').slice(0, 6).toUpperCase();
      return `CARY-${clean}`;
    }
    return 'CARY-GO2026';
  }, [user?.id]);

  const referralLink = `https://carygoo.app/invite?ref=${referralCode}`;

  const handleCopy = async () => {
    Haptic.confirm();
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    Haptic.select();
    try {
      const shareMessage = `Send parcels anywhere across Haryana & Delhi NCR fast and affordably with CaryGoo! Use my referral code ${referralCode} to get ₹50 OFF your first delivery: ${referralLink}`;
      await Share.share({
        message: shareMessage,
        title: 'Join CaryGoo Peer Delivery',
      });
    } catch (err) {
      // Non-blocking
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.xs,
            borderBottomColor: C.surfaceBorder,
            backgroundColor: C.surface,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: C.surfaceElevated }]}
          hitSlop={8}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Refer & Earn</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xxl },
          isTablet && styles.tabletContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={[styles.heroCard, { backgroundColor: isDark ? '#00332c' : '#E6F4F1', borderColor: C.primary }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: C.primary }]}>
            <MaterialIcons name="card-giftcard" size={28} color="#FFFFFF" />
          </View>
          <Text style={[styles.heroTitle, { color: C.textPrimary }]}>Give ₹50, Get ₹100</Text>
          <Text style={[styles.heroSub, { color: C.textSecondary }]}>
            Invite your friends to CaryGoo. When they complete their first parcel booking or traveler trip, you earn ₹100 credits!
          </Text>
        </View>

        {/* Referral Code Box */}
        <View style={[styles.codeCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <Text style={[styles.codeLabel, { color: C.textMuted }]}>YOUR EXCLUSIVE REFERRAL CODE</Text>
          <View style={[styles.codeBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
            <Text style={[styles.codeText, { color: C.primary }]}>{referralCode}</Text>
            <Pressable
              onPress={handleCopy}
              style={[
                styles.copyBtn,
                { backgroundColor: copied ? C.success : C.primary },
              ]}
            >
              <MaterialIcons
                name={copied ? 'check' : 'content-copy'}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
            </Pressable>
          </View>

          <View style={styles.shareRow}>
            <Pressable
              onPress={handleShare}
              style={[styles.shareActionBtn, { backgroundColor: C.primary }]}
            >
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
              <Text style={styles.shareActionBtnText}>Share Referral Link</Text>
            </Pressable>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>How It Works</Text>
          <View style={[styles.stepsContainer, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.stepItem}>
              <View style={[styles.stepNumberBadge, { backgroundColor: C.primarySubtle }]}>
                <Text style={[styles.stepNumberText, { color: C.primary }]}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Share Your Code</Text>
                <Text style={[styles.stepBody, { color: C.textSecondary }]}>
                  Send your referral code or link to friends, family, or travel buddies.
                </Text>
              </View>
            </View>

            <View style={[styles.stepDivider, { backgroundColor: C.surfaceBorder }]} />

            <View style={styles.stepItem}>
              <View style={[styles.stepNumberBadge, { backgroundColor: C.primarySubtle }]}>
                <Text style={[styles.stepNumberText, { color: C.primary }]}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: C.textPrimary }]}>Friend Signs Up & Transacts</Text>
                <Text style={[styles.stepBody, { color: C.textSecondary }]}>
                  Your friend receives an instant ₹50 discount on their first parcel delivery.
                </Text>
              </View>
            </View>

            <View style={[styles.stepDivider, { backgroundColor: C.surfaceBorder }]} />

            <View style={styles.stepItem}>
              <View style={[styles.stepNumberBadge, { backgroundColor: C.primarySubtle }]}>
                <Text style={[styles.stepNumberText, { color: C.primary }]}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: C.textPrimary }]}>You Earn ₹100</Text>
                <Text style={[styles.stepBody, { color: C.textSecondary }]}>
                  Once their delivery completes successfully, ₹100 credit is deposited directly into your rewards wallet.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Affiliate Program Tiers */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Affiliate Tiers</Text>
            <View style={[styles.affiliateBadge, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="military-tech" size={14} color={C.primary} />
              <Text style={[styles.affiliateBadgeText, { color: C.primary }]}>Program Levels</Text>
            </View>
          </View>

          <View style={styles.tierGrid}>
            <View style={[styles.affiliateTierCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <View style={styles.tierHeader}>
                <Text style={[styles.tierName, { color: C.textPrimary }]}>Level 1: Scout</Text>
                <Text style={[styles.tierReward, { color: C.primary }]}>₹100 / referral</Text>
              </View>
              <Text style={[styles.tierRequirement, { color: C.textMuted }]}>1 – 4 successful referrals</Text>
            </View>

            <View style={[styles.affiliateTierCard, { backgroundColor: C.surface, borderColor: C.primary }]}>
              <View style={styles.tierHeader}>
                <Text style={[styles.tierName, { color: C.textPrimary }]}>Level 2: Ambassador</Text>
                <Text style={[styles.tierReward, { color: C.primary }]}>₹150 / referral</Text>
              </View>
              <Text style={[styles.tierRequirement, { color: C.textMuted }]}>5 – 19 successful referrals</Text>
            </View>

            <View style={[styles.affiliateTierCard, { backgroundColor: C.surface, borderColor: '#10B981' }]}>
              <View style={styles.tierHeader}>
                <Text style={[styles.tierName, { color: C.textPrimary }]}>Level 3: Partner</Text>
                <Text style={[styles.tierReward, { color: '#10B981' }]}>₹200 / referral + 5% comm.</Text>
              </View>
              <Text style={[styles.tierRequirement, { color: C.textMuted }]}>20+ successful referrals</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  tabletContainer: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  heroCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  codeCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  codeLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.md,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  codeText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  shareRow: {
    marginTop: Spacing.xs,
  },
  shareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  shareActionBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  affiliateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  affiliateBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  stepsContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  stepBody: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  stepDivider: {
    height: 1,
    marginVertical: Spacing.md,
    marginLeft: 36,
  },
  tierGrid: {
    gap: Spacing.xs,
  },
  affiliateTierCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm + 2,
    gap: 2,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  tierReward: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  tierRequirement: {
    fontSize: FontSize.xs,
  },
});

