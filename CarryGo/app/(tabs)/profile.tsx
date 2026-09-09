import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors, TouchTarget } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import KycOnboarding from '@/components/feature/KycOnboarding';
import { LinearGradient } from 'expo-linear-gradient';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { flattenInfiniteData, useParcelsQuery, useTripsQuery } from '@/features/listings/queries';
import { useRequestsQuery } from '@/features/requests/queries';
import { useResponsive } from '@/hooks/useResponsive';
import { useFadeIn, useBreathing, useHeartbeat } from '@/hooks/useAnimations';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
  C: ThemeColors;
  subtitle?: string;
}

function MenuItem({ icon, label, onPress, danger, right, C, subtitle }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && { backgroundColor: C.primarySubtle, opacity: 0.9, transform: [{ scale: 0.97 }] },
      ]}
      hitSlop={TouchTarget.smallHitSlop}
      onPress={() => { if (onPress) { Haptic.tap(); onPress(); } }}
      disabled={!onPress && !right}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: danger ? C.errorSubtle : C.surfaceElevated }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color: danger ? C.error : C.textPrimary }]}>{label}</Text>
        {subtitle ? <Text style={[styles.menuSubtitle, { color: C.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {right ?? null}
      {onPress && !right ? (
        <View style={[styles.menuChevronWrap, { backgroundColor: C.surfaceElevated }]}>
          <MaterialIcons name="chevron-right" size={16} color={C.textMuted} />
        </View>
      ) : null}
    </Pressable>
  );
}

function StatPill({
  label,
  value,
  icon,
  color,
  C,
  iconAnim,
  isSmallDevice,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  C: ThemeColors;
  iconAnim?: Animated.Value;
  isSmallDevice?: boolean;
}) {
  return (
    <View style={[styles.statPill, isSmallDevice && { paddingHorizontal: 2 }, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <Animated.View style={[styles.statPillIcon, { backgroundColor: color + '14' }, iconAnim ? { transform: [{ scale: iconAnim }] } : undefined]}>
        <MaterialIcons name={icon} size={14} color={color} />
      </Animated.View>
      <View style={styles.statPillContent}>
        <Text style={[styles.statPillVal, isSmallDevice && { fontSize: FontSize.md }, { color: C.textPrimary }]}>{value}</Text>
        <Text style={[styles.statPillLabel, { color: C.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();
  const { isSmallDevice, isTablet } = useResponsive();
  const heroEntrance = useFadeIn(0, 520);
  const statsEntrance = useFadeIn(120, 440);
  const sectionsEntrance = useFadeIn(220, 440);
  const avatarBreathing = useBreathing(0.97, 1, 4500);
  const starHeartbeat = useHeartbeat(5000, 1.12);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showKyc, setShowKyc] = useState(false);
  const tripsQuery = useTripsQuery(Boolean(user));
  const parcelsQuery = useParcelsQuery(Boolean(user));
  const requestsQuery = useRequestsQuery(user?.id);
  const scrollRef = useRef<ScrollView | null>(null);

  const trips = user ? flattenInfiniteData(tripsQuery.data) : [];
  const parcels = user ? flattenInfiniteData(parcelsQuery.data) : [];
  const requests = user ? requestsQuery.data ?? [] : [];
  const myTrips = trips.filter(t => t.userId === user?.id);
  const myParcels = parcels.filter(p => p.userId === user?.id);
  const completed = requests.filter(r =>
    (r.senderId === user?.id || r.travellerId === user?.id) && r.status === 'completed'
  ).length;

  const handleLogout = () => {
    Haptic.warning();
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };
  const handleDeleteAccount = () => {
    Haptic.warning();
    showAlert('Delete account?', 'This permanently removes your CarryGo account and signs you out. This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Account',
        style: 'destructive',
        onPress: () => {
          Haptic.warning();
          showAlert('Final confirmation', 'Please confirm you want to permanently delete this account.', [
            { text: 'Keep Account', style: 'cancel' },
            {
              text: 'Delete Permanently',
              style: 'destructive',
              onPress: async () => {
                const result = await deleteAccount();
                if (result.error) {
                  showAlert('Deletion failed', result.error);
                  return;
                }
                showAlert('Account deleted', 'Your account has been deleted successfully.');
                router.replace('/login');
              },
            },
          ]);
        },
      },
    ]);
  };
  if (!user) return null;

  const displayName = user.fullName || user.name || user.email?.split('@')[0] || 'User';
  const isKycAvailable = FeatureFlags.kycProvider;
  const isKycApproved = isKycAvailable && user.kycStatus === 'approved';
  const isKycSubmitted = isKycAvailable && user.kycStatus === 'submitted';
  const canOpenKycBanner = !isKycApproved && !isKycSubmitted;

  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, 190],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  const heroScale = scrollY.interpolate({
    inputRange: [0, 210],
    outputRange: [1, 0.975],
    extrapolate: 'clamp',
  });

  const kycColor = !isKycAvailable ? C.warning : isKycApproved ? C.success : isKycSubmitted ? C.warning : C.error;
  const kycBg = !isKycAvailable ? C.warningSubtle : isKycApproved ? C.successSubtle : isKycSubmitted ? C.warningSubtle : C.errorSubtle;
  const kycTitle = !isKycAvailable ? 'Identity Verification Unavailable' : isKycApproved ? 'Identity Verified' : isKycSubmitted ? 'KYC Under Review' : 'Verify Your Identity';
  const kycBody = !isKycAvailable
    ? disabledFeatureMessage.kyc
    : isKycApproved
    ? 'You can send and carry parcels freely.'
    : isKycSubmitted
    ? 'Usually approved within 24 hours.'
    : 'Needed to send or carry parcels - 2 min process.';

  return (
    <>
      <KycOnboarding
        visible={showKyc}
        onClose={() => setShowKyc(false)}
        onComplete={() => { setShowKyc(false); }}
      />
      <Animated.ScrollView
        ref={scrollRef}
        keyboardDismissMode="on-drag"
        style={[styles.container, { backgroundColor: C.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 120 }, isTablet && styles.tabletContainer]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Modern Horizontal Executive Hero */}
        <Animated.View style={{ opacity: heroEntrance.opacity, transform: [...heroEntrance.transform, { translateY: heroTranslateY }, { scale: heroScale }] }}>
          <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, isSmallDevice && styles.heroCardSmall]}>
            {/* Subtle Gradient Backing */}
            <LinearGradient
              colors={['#FFFFFF', '#FAFDFB', '#F8FAFC']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            />

            {/* Main Horizontal Identity Block */}
            <View style={styles.heroMainRow}>
              {/* Avatar on Left */}
              <Animated.View style={[styles.avatarOuter, { transform: [{ scale: avatarBreathing }] }]}>
                <LinearGradient
                  colors={[C.primary, C.primaryLight]}
                  style={styles.avatarGradientRing}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
                <View style={[styles.avatarInner, { backgroundColor: C.surface }]}>
                  <View style={[styles.avatar, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[styles.avatarText, { color: '#064E3B' }]}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </View>
                {isKycApproved ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: '#059669', borderColor: '#FFFFFF' }]}>
                    <MaterialIcons name="check" size={10} color="#fff" />
                  </View>
                ) : null}
              </Animated.View>

              {/* User Identity Details */}
              <View style={styles.heroMetaWrap}>
                <View style={styles.heroNameRow}>
                  <Text style={[styles.profileName, { color: C.textPrimary }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {isKycApproved ? (
                    <View style={[styles.trustTag, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                      <MaterialIcons name="verified" size={11} color="#059669" />
                      <Text style={[styles.trustTagText, { color: '#064E3B' }]}>Verified</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.emailRow}>
                  <Ionicons name="mail-outline" size={12} color={C.textMuted} />
                  <Text style={[styles.profileEmail, { color: C.textMuted }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>

                {/* Rating & Member Chips Row */}
                <View style={styles.heroChipsRow}>
                  <View style={[styles.ratingPill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                    <MaterialIcons name="star" size={12} color="#D97706" />
                    <Text style={[styles.ratingPillText, { color: '#B45309' }]}>
                      {(user.rating || 4.9).toFixed(1)} Rating
                    </Text>
                  </View>

                  <View style={[styles.memberPill, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                    <MaterialIcons name="shield" size={11} color="#64748B" />
                    <Text style={[styles.memberPillText, { color: '#475569' }]}>
                      Since {new Date(user.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom Quick Action Strip */}
            <View style={[styles.heroBottomDivider, { backgroundColor: C.surfaceBorder + '66' }]} />
            <Pressable
              style={({ pressed }) => [
                styles.editProfileFullBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }
              ]}
              hitSlop={TouchTarget.smallHitSlop}
              onPress={() => { Haptic.tap(); router.push('/edit-profile'); }}
            >
              <View style={styles.editBtnLeft}>
                <View style={[styles.editIconCircle, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Ionicons name="pencil" size={12} color="#059669" />
                </View>
                <View style={styles.editTextWrap}>
                  <Text style={[styles.editProfileFullBtnText, { color: C.textPrimary }]}>Edit Profile & Settings</Text>
                  <Text style={[styles.editProfileSubText, { color: C.textMuted }]}>Manage profile details, security & alerts</Text>
                </View>
              </View>
              <View style={[styles.editChevronWrap, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                <MaterialIcons name="chevron-right" size={14} color={C.textMuted} />
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View style={{ opacity: statsEntrance.opacity, transform: statsEntrance.transform }}>
          <View style={styles.statsGrid}>
            <StatPill label="Rating" value={(user.rating || 4.5).toFixed(1)} icon="star" color={C.warning} C={C} iconAnim={starHeartbeat} isSmallDevice={isSmallDevice} />
            <StatPill label="Trips" value={String(myTrips.length)} icon="directions-car" color={C.primary} C={C} isSmallDevice={isSmallDevice} />
            <StatPill label="Parcels" value={String(myParcels.length)} icon="inventory-2" color={C.success} C={C} isSmallDevice={isSmallDevice} />
            <StatPill label="Delivered" value={String(completed)} icon="check-circle" color={C.info} C={C} isSmallDevice={isSmallDevice} />
          </View>
        </Animated.View>

        {/* KYC Banner */}
        <Pressable
          style={[styles.kycBanner, { backgroundColor: kycBg, borderColor: kycColor + '30' }]}
          hitSlop={TouchTarget.smallHitSlop}
          onPress={canOpenKycBanner ? () => setShowKyc(true) : undefined}
          disabled={!canOpenKycBanner}
        >
          <View style={[styles.kycIconWrap, { backgroundColor: kycColor + '18' }]}>
            <MaterialIcons
              name={isKycApproved ? 'verified-user' : isKycSubmitted ? 'hourglass-empty' : 'shield'}
              size={18}
              color={kycColor}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kycTitle, { color: kycColor }]}>{kycTitle}</Text>
            <Text style={[styles.kycBody, { color: kycColor + 'AA' }]}>{kycBody}</Text>
          </View>
          {canOpenKycBanner ? (
            <View style={[styles.kycCta, { backgroundColor: kycColor }]}>
              <Text style={styles.kycCtaText}>Start</Text>
              <MaterialIcons name="arrow-forward" size={11} color="#fff" />
            </View>
          ) : isKycApproved ? (
            <MaterialIcons name="check-circle" size={20} color={C.success} />
          ) : (
            <View style={[styles.pendingChip, { backgroundColor: C.warning + '20' }]}>
              <Text style={[styles.pendingChipText, { color: C.warning }]}>Pending</Text>
            </View>
          )}
        </Pressable>

        {/* Sections */}
        <Animated.View style={[styles.sectionsWrap, { opacity: sectionsEntrance.opacity, transform: sectionsEntrance.transform }]}>

          {/* Activity */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Activity</Text>
            <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MenuItem C={C}
                icon={<MaterialIcons name="bar-chart" size={17} color={C.primary} />}
                label="My Activity"
                subtitle={`${myTrips.length} trips • ${myParcels.length} parcels`}
                onPress={() => router.push('/my-activity')}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder + '66' }]} />
              <MenuItem C={C}
                icon={<MaterialIcons name="receipt-long" size={17} color={C.warning} />}
                label="Transactions"
                subtitle={FeatureFlags.payments ? 'Payment history' : 'Unavailable'}
                onPress={() => router.push('/transactions')}
              />
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Preferences</Text>
            <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MenuItem C={C}
                icon={<MaterialIcons name="notifications-active" size={17} color={C.primary} />}
                label="Route Alerts"
                subtitle="Matching route notifications"
                onPress={() => router.push('/subscriptions')}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder + '66' }]} />
              <MenuItem C={C}
                icon={<Ionicons name={'sunny'} size={17} color={C.warning} />}
                label={'Light Theme'}
                subtitle="Clean white-first interface"
                right={<MaterialIcons name="check-circle" size={18} color={C.success} />}
              />
            </View>
          </View>

          {/* Account */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Account</Text>
            <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MenuItem C={C}
                icon={<MaterialIcons name="verified-user" size={17} color={!isKycAvailable ? C.warning : isKycApproved ? C.success : C.error} />}
                label="KYC Verification"
                subtitle={!isKycAvailable ? 'Provider required' : isKycApproved ? 'Approved' : isKycSubmitted ? 'Under Review' : 'Not started'}
                onPress={!isKycAvailable || isKycApproved ? undefined : () => setShowKyc(true)}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder + '66' }]} />
              <MenuItem C={C}
                icon={<MaterialIcons name="delete-outline" size={17} color={C.error} />}
                label="Delete Account"
                subtitle="Permanently remove your profile and data"
                onPress={handleDeleteAccount}
                danger
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder + '66' }]} />
              <MenuItem C={C}
                icon={<Ionicons name="log-out-outline" size={17} color={C.error} />}
                label="Logout"
                onPress={handleLogout}
                danger
              />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={[styles.footerDivider, { backgroundColor: C.surfaceBorder + '44' }]} />
            <View style={styles.footerContent}>
              <MaterialIcons name="local-shipping" size={12} color={C.textMuted + '88'} />
              <Text style={[styles.footerText, { color: C.textMuted + '88' }]}>CarryGo v1.0</Text>
              <View style={[styles.footerDot, { backgroundColor: C.textMuted + '44' }]} />
              <Text style={[styles.footerText, { color: C.textMuted + '88' }]}>Peer-to-Peer Logistics</Text>
            </View>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 2, gap: Spacing.md + 4 },
  tabletContainer: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },

  // Hero
  heroCard: {
    borderRadius: BorderRadius.xl + 4,
    paddingTop: Spacing.lg + 6,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginTop: Spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  heroCardSmall: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md + 2,
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md + 2,
  },

  // Avatar
  avatarOuter: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarGradientRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
  },
  avatarInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  // Identity Meta
  heroMetaWrap: { flex: 1, gap: 3 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  profileName: {
    fontSize: FontSize.lg + 2,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.4,
  },
  trustTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  trustTagText: { fontSize: 10, fontWeight: FontWeight.bold },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  profileEmail: { fontSize: FontSize.xs, letterSpacing: 0.1 },
  heroChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  ratingPillText: { fontSize: 11, fontWeight: FontWeight.bold },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  memberPillText: { fontSize: 11, fontWeight: FontWeight.medium },

  // Bottom action
  heroBottomDivider: { height: 1 },
  editProfileFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  editBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  editIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editTextWrap: { flex: 1, gap: 1 },
  editProfileFullBtnText: { fontSize: FontSize.xs + 1, fontWeight: FontWeight.bold },
  editProfileSubText: { fontSize: 10, fontWeight: FontWeight.regular },
  editChevronWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statPill: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: Spacing.md - 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 5,
  },
  statPillIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statPillContent: { alignItems: 'center', gap: 1 },
  statPillVal: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  statPillLabel: { fontSize: 9, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.5 },

  // KYC
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    padding: Spacing.mdl,
    borderRadius: BorderRadius.lg + 2,
    borderWidth: 1,
  },
  kycIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kycTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, letterSpacing: -0.1 },
  kycBody: { fontSize: FontSize.xs, lineHeight: 16, marginTop: 2 },
  kycCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  kycCtaText: { fontSize: FontSize.xs, color: '#fff', fontWeight: FontWeight.bold },
  pendingChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  pendingChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  // Sections
  sectionsWrap: { gap: Spacing.lg, marginTop: Spacing.sm },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginLeft: Spacing.xs,
  },
  menuCard: {
    borderRadius: BorderRadius.lg + 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md - 2,
    minHeight: 58,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: FontSize.md - 1, fontWeight: FontWeight.medium, letterSpacing: -0.1 },
  menuSubtitle: { fontSize: FontSize.xs - 1, marginTop: 2, letterSpacing: 0.1 },
  menuChevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  div: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.md + 36 + Spacing.md - 2 },

  // Footer
  footer: { paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  footerDivider: { height: StyleSheet.hairlineWidth, marginBottom: Spacing.md },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  footerText: { fontSize: 10, fontWeight: FontWeight.medium, letterSpacing: 0.3 },
  footerDot: { width: 3, height: 3, borderRadius: 1.5 },
});






