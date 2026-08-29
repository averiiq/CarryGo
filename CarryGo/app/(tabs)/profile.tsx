import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import KycOnboarding from '@/components/feature/KycOnboarding';
import { LinearGradient } from 'expo-linear-gradient';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { flattenInfiniteData, useParcelsQuery, useTripsQuery } from '@/features/listings/queries';
import { useRequestsQuery } from '@/features/requests/queries';
import { useFadeIn, useBreathing, useHeartbeat } from '@/hooks/useAnimations';
import { ProductIllustration } from '@/components/illustrations';

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
        pressed && { backgroundColor: C.primarySubtle, transform: [{ scale: 0.985 }] },
      ]}
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

function StatPill({ label, value, icon, color, C, iconAnim }: { label: string; value: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; C: ThemeColors; iconAnim?: Animated.Value }) {
  return (
    <View style={[styles.statPill, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <Animated.View style={[styles.statPillIcon, { backgroundColor: color + '14' }, iconAnim ? { transform: [{ scale: iconAnim }] } : undefined]}>
        <MaterialIcons name={icon} size={14} color={color} />
      </Animated.View>
      <View style={styles.statPillContent}>
        <Text style={[styles.statPillVal, { color: C.textPrimary }]}>{value}</Text>
        <Text style={[styles.statPillLabel, { color: C.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();
  const heroEntrance = useFadeIn(0, 600);
  const statsEntrance = useFadeIn(120, 500);
  const sectionsEntrance = useFadeIn(240, 500);
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
    : 'Needed to send or carry parcels — 2 min process.';

  return (
    <>
      <KycOnboarding
        visible={showKyc}
        onClose={() => setShowKyc(false)}
        onComplete={() => { setShowKyc(false); }}
      />
      <Animated.ScrollView
        ref={scrollRef}
        style={[styles.container, { backgroundColor: C.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* ── Hero ──────────────────────────────────────── */}
        <Animated.View style={{ opacity: heroEntrance.opacity, transform: [...heroEntrance.transform, { translateY: heroTranslateY }, { scale: heroScale }] }}>
          <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={styles.heroBackdropImage}>
              <ProductIllustration variant="profile" size={180} />
            </View>
            <LinearGradient
              colors={[C.primaryGlow, C.primarySubtle, 'rgba(255,255,255,0.4)']}
              style={[StyleSheet.absoluteFillObject, { opacity: 0.8 }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <LinearGradient
              colors={['transparent', C.surface]}
              style={[StyleSheet.absoluteFillObject]}
              start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.85 }}
            />

            {/* Edit button — top right */}
            <View style={styles.heroTopRight}>
              <Pressable
                style={({ pressed }) => [styles.editBtn, { backgroundColor: C.surface + 'CC', borderColor: C.surfaceBorder }, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
                onPress={() => { Haptic.tap(); router.push('/edit-profile'); }}
              >
                <Ionicons name="pencil" size={12} color={C.textSecondary} />
                <Text style={[styles.editBtnText, { color: C.textSecondary }]}>Edit</Text>
              </Pressable>
            </View>

            {/* Avatar */}
            <Animated.View style={[styles.avatarOuter, { transform: [{ scale: avatarBreathing }] }]}>
              <LinearGradient
                colors={[C.primary, C.primaryLight]}
                style={styles.avatarGradientRing}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <View style={[styles.avatarInner, { backgroundColor: C.surface }]}>
                <View style={[styles.avatar, { backgroundColor: C.primarySubtle }]}>
                  <Text style={[styles.avatarText, { color: C.primary }]}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
              </View>
              {isKycApproved ? (
                <View style={[styles.verifiedBadge, { backgroundColor: C.success, borderColor: C.surface }]}>
                  <MaterialIcons name="check" size={10} color="#fff" />
                </View>
              ) : null}
            </Animated.View>

            {/* Name + Email */}
            <Text style={[styles.profileName, { color: C.textPrimary }]}>{displayName}</Text>
            <Text style={[styles.profileEmail, { color: C.textMuted }]}>{user.email}</Text>

            {/* Member badge */}
            <View style={[styles.memberChip, { backgroundColor: C.surfaceElevated + '88', borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="auto-awesome" size={10} color={C.primaryLight} />
              <Text style={[styles.memberText, { color: C.textSecondary }]}>
                Member since {new Date(user.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Stats ─────────────────────────────────────── */}
        <Animated.View style={{ opacity: statsEntrance.opacity, transform: statsEntrance.transform }}>
          <View style={styles.statsGrid}>
            <StatPill label="Rating" value={(user.rating || 4.5).toFixed(1)} icon="star" color={C.warning} C={C} iconAnim={starHeartbeat} />
            <StatPill label="Trips" value={String(myTrips.length)} icon="directions-car" color={C.primary} C={C} />
            <StatPill label="Parcels" value={String(myParcels.length)} icon="inventory-2" color={C.success} C={C} />
            <StatPill label="Delivered" value={String(completed)} icon="check-circle" color={C.info} C={C} />
          </View>
        </Animated.View>

        {/* ── KYC Banner ────────────────────────────────── */}
        <Pressable
          style={[styles.kycBanner, { backgroundColor: kycBg, borderColor: kycColor + '30' }]}
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

        {/* ── Sections ─────────────────────────────────── */}
        <Animated.View style={[styles.sectionsWrap, { opacity: sectionsEntrance.opacity, transform: sectionsEntrance.transform }]}>

          {/* Activity */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Activity</Text>
            <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MenuItem C={C}
                icon={<MaterialIcons name="bar-chart" size={17} color={C.primary} />}
                label="My Activity"
                subtitle={`${myTrips.length} trips · ${myParcels.length} parcels`}
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

  // Hero
  heroCard: {
    borderRadius: BorderRadius.xl + 4,
    paddingTop: Spacing.xxl + 8,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginTop: Spacing.sm,
  },
  heroBackdropImage: {
    position: 'absolute',
    right: -28,
    top: -8,
    opacity: 0.2,
  },
  heroTopRight: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  editBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  // Avatar
  avatarOuter: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatarGradientRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 48,
  },
  avatarInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },

  // Profile text
  profileName: {
    fontSize: FontSize.xxl + 2,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  profileEmail: { fontSize: FontSize.sm, marginTop: 2, letterSpacing: 0.1 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  memberText: { fontSize: 10, fontWeight: FontWeight.medium, letterSpacing: 0.2 },

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
    padding: Spacing.md,
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
  sectionsWrap: { gap: Spacing.lg },
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
