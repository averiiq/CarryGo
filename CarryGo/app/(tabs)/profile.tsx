import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTheme } from '@/contexts/ThemeContext';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors, Gradients } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import KycOnboarding from '@/components/feature/KycOnboarding';
import { AppTour, type AppTourTargetId } from '@/components/feature/AppTour';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { flattenInfiniteData, useParcelsQuery, useTripsQuery } from '@/features/listings/queries';
import { useRequestsQuery } from '@/features/requests/queries';
import { useFadeIn, useBreathing, useHeartbeat } from '@/hooks/useAnimations';

const TOUR_KEY = 'carrygo_app_tour_seen';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  badge?: number;
  right?: React.ReactNode;
  C: ThemeColors;
  subtitle?: string;
}

function MenuItem({ icon, label, value, onPress, danger, badge, right, C, subtitle }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && { backgroundColor: C.surfaceElevated, transform: [{ scale: 0.99 }] },
      ]}
      onPress={() => { if (onPress) { Haptic.tap(); onPress(); } }}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: danger ? C.errorSubtle : C.surfaceElevated, borderRadius: 10, width: 36, height: 36 }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color: danger ? C.error : C.textPrimary }]}>{label}</Text>
        {subtitle ? <Text style={[styles.menuSubtitle, { color: C.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={[styles.menuValue, { color: C.textMuted }]}>{value}</Text> : null}
      {badge ? (
        <View style={[styles.menuBadge, { backgroundColor: C.error }]}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      ) : null}
      {right ?? null}
      {onPress && !right ? <MaterialIcons name="chevron-right" size={18} color={C.surfaceBorderLight} /> : null}
    </Pressable>
  );
}

function StatCard({ label, value, icon, color, C, iconAnim }: { label: string; value: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; C: ThemeColors; iconAnim?: Animated.Value }) {
  return (
    <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <Animated.View style={[styles.statIconBg, { backgroundColor: color + '15' }, iconAnim ? { transform: [{ scale: iconAnim }] } : undefined]}>
        <MaterialIcons name={icon} size={16} color={color} />
      </Animated.View>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: C.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();
  const { isDark, toggleTheme } = useTheme();
  const heroEntrance = useFadeIn(0, 500);
  const statsEntrance = useFadeIn(150, 450);
  const sectionsEntrance = useFadeIn(280, 450);
  const avatarBreathing = useBreathing(0.96, 1, 4000);
  const starHeartbeat = useHeartbeat(4500, 1.15);
  const [showKyc, setShowKyc] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const tripsQuery = useTripsQuery(Boolean(user));
  const parcelsQuery = useParcelsQuery(Boolean(user));
  const requestsQuery = useRequestsQuery(user?.id);
  const scrollRef = useRef<ScrollView | null>(null);
  const profileCardTourRef = useRef<View | null>(null);
  const identityTourRef = useRef<View | null>(null);
  const profileStatsTourRef = useRef<View | null>(null);
  const activityTourRef = useRef<View | null>(null);
  const preferencesTourRef = useRef<View | null>(null);
  const accountTourRef = useRef<View | null>(null);
  const tourTargets = useMemo<Partial<Record<AppTourTargetId, React.RefObject<View | null>>>>(() => ({
    profileCard: profileCardTourRef,
    identity: identityTourRef,
    profileStats: profileStatsTourRef,
    activityMenu: activityTourRef,
    preferencesMenu: preferencesTourRef,
    accountMenu: accountTourRef,
  }), []);
  const handleTourStepChange = (target: AppTourTargetId) => {
    const scrollOffsets: Partial<Record<AppTourTargetId, number>> = {
      profileCard: 0,
      identity: 150,
      profileStats: 250,
      activityMenu: 360,
      preferencesMenu: 510,
      accountMenu: 690,
    };
    const y = scrollOffsets[target];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y, animated: true });
    }
  };

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

  const handleReplayTour = async () => {
    await AsyncStorage.removeItem(TOUR_KEY);
    setShowTour(true);
  };

  if (!user) return null;

  const displayName = user.fullName || user.name || user.email?.split('@')[0] || 'User';
  const isKycAvailable = FeatureFlags.kycProvider;
  const isKycApproved = isKycAvailable && user.kycStatus === 'approved';
  const isKycSubmitted = isKycAvailable && user.kycStatus === 'submitted';
  const canOpenKycBanner = !isKycApproved && !isKycSubmitted;

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
        onComplete={() => {
          setShowKyc(false);
        }}
      />
      <AppTour
        visible={showTour}
        onDone={() => setShowTour(false)}
        targets={tourTargets}
        variant="profile"
        onStepChange={handleTourStepChange}
      />

      <ScrollView
        ref={scrollRef}
        style={[styles.container, { backgroundColor: C.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ──────────────────────────────────── */}
        <Animated.View style={{ opacity: heroEntrance.opacity, transform: heroEntrance.transform }}>
          <View ref={profileCardTourRef} collapsable={false} style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <LinearGradient
              colors={[C.primaryGlow, 'transparent']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />

            <View style={styles.heroTop}>
              {/* Avatar */}
              <Animated.View style={{ transform: [{ scale: avatarBreathing }] }}>
                <View style={[styles.avatarRing, { borderColor: C.primary + '55' }]}>
                  <View style={[styles.avatar, { backgroundColor: C.primarySubtle }]}>
                    <Text style={[styles.avatarText, { color: C.primary }]}>{displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                  {isKycApproved ? (
                    <View style={[styles.verifiedBadge, { backgroundColor: C.success, borderColor: C.surface }]}>
                      <MaterialIcons name="check" size={9} color="#fff" />
                    </View>
                  ) : null}
                </View>
              </Animated.View>

              {/* Edit button */}
              <Pressable
                style={({ pressed }) => [styles.editBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.75 }]}
                onPress={() => { Haptic.tap(); router.push('/edit-profile'); }}
              >
                <Ionicons name="pencil" size={13} color={C.textSecondary} />
                <Text style={[styles.editBtnText, { color: C.textSecondary }]}>Edit</Text>
              </Pressable>
            </View>

            <Text style={[styles.profileName, { color: C.textPrimary }]}>{displayName}</Text>
            <Text style={[styles.profileEmail, { color: C.textMuted }]}>{user.email}</Text>

            {/* Member since */}
            <View style={[styles.memberBadge, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="calendar-today" size={11} color={C.textMuted} />
              <Text style={[styles.memberText, { color: C.textMuted }]}>
                Member since {new Date(user.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── KYC Banner ─────────────────────────────────── */}
        <View ref={identityTourRef} collapsable={false}>
          <Pressable
            style={[styles.kycBanner, { backgroundColor: kycBg, borderColor: kycColor + '50' }]}
            onPress={canOpenKycBanner ? () => setShowKyc(true) : undefined}
            disabled={!canOpenKycBanner}
          >
            <View style={[styles.kycIconWrap, { backgroundColor: kycColor + '20' }]}>
              <MaterialIcons
                name={isKycApproved ? 'verified-user' : isKycSubmitted ? 'hourglass-empty' : 'shield'}
                size={18}
                color={kycColor}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kycTitle, { color: kycColor }]}>{kycTitle}</Text>
              <Text style={[styles.kycBody, { color: kycColor + 'BB' }]}>{kycBody}</Text>
            </View>
            {canOpenKycBanner ? (
              <View style={[styles.kycCta, { backgroundColor: kycColor }]}>
                <Text style={styles.kycCtaText}>{isKycAvailable ? 'Start' : 'View'}</Text>
                <MaterialIcons name="arrow-forward" size={12} color="#fff" />
              </View>
            ) : isKycApproved ? (
              <MaterialIcons name="check-circle" size={20} color={C.success} />
            ) : (
              <View style={[styles.pendingBadge, { backgroundColor: C.warning + '25' }]}>
                <Text style={[styles.pendingBadgeText, { color: C.warning }]}>Pending</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Stats ──────────────────────────────────────── */}
        <Animated.View style={{ opacity: statsEntrance.opacity, transform: statsEntrance.transform }}>
          <View ref={profileStatsTourRef} collapsable={false} style={styles.statsRow}>
            <StatCard label="Rating" value={(user.rating || 4.5).toFixed(1)} icon="star" color={C.warning} C={C} iconAnim={starHeartbeat} />
            <StatCard label="Trips" value={String(myTrips.length)} icon="directions-car" color={C.primary} C={C} />
            <StatCard label="Parcels" value={String(myParcels.length)} icon="inventory-2" color={C.success} C={C} />
            <StatCard label="Delivered" value={String(completed)} icon="check-circle" color={C.info} C={C} />
          </View>
        </Animated.View>

        {/* ── Activity ───────────────────────────────────── */}
        <Animated.View style={{ opacity: sectionsEntrance.opacity, transform: sectionsEntrance.transform }}>
        <View ref={activityTourRef} collapsable={false} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>My Activity</Text>
          <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <MenuItem C={C}
              icon={<MaterialIcons name="bar-chart" size={18} color={C.primary} />}
              label="My Activity"
              subtitle={`${myTrips.length} trips · ${myParcels.length} parcels`}
              badge={myTrips.length + myParcels.length > 0 ? undefined : undefined}
              onPress={() => router.push('/my-activity')}
            />
            <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
            <MenuItem C={C}
              icon={<MaterialIcons name="receipt-long" size={18} color={C.warning} />}
              label="Transaction History"
              subtitle={FeatureFlags.payments ? 'Payment records' : 'Payment integration unavailable'}
              onPress={() => router.push('/transactions')}
            />
          </View>
        </View>

        {/* ── Preferences ────────────────────────────────── */}
        <View ref={preferencesTourRef} collapsable={false} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Preferences</Text>
          <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <MenuItem C={C}
              icon={<MaterialIcons name="notifications-active" size={18} color={C.primary} />}
              label="Route Alerts"
              subtitle="Get notified for matching routes"
              onPress={() => router.push('/subscriptions')}
            />
            <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
            <MenuItem C={C}
              icon={<Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={isDark ? '#A78BFA' : C.warning} />}
              label={isDark ? 'Dark Mode' : 'Light Mode'}
              subtitle="Toggle app appearance"
              right={
                <Switch
                  value={isDark}
                  onValueChange={() => { Haptic.select(); toggleTheme(); }}
                  trackColor={{ false: C.surfaceBorderLight, true: C.primary + '88' }}
                  thumbColor={isDark ? C.primary : C.surfaceBorder}
                  ios_backgroundColor={C.surfaceBorderLight}
                />
              }
            />
            <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
            <MenuItem C={C}
              icon={<MaterialIcons name="tour" size={18} color={C.info} />}
              label="Replay App Tour"
              subtitle="Show the guided walkthrough again"
              onPress={handleReplayTour}
            />
          </View>
        </View>

        {/* ── Account ────────────────────────────────────── */}
        <View ref={accountTourRef} collapsable={false} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Account</Text>
          <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <MenuItem C={C}
              icon={<MaterialIcons name="verified-user" size={18} color={!isKycAvailable ? C.warning : isKycApproved ? C.success : C.error} />}
              label="KYC Verification"
              subtitle={!isKycAvailable ? 'Provider integration required' : isKycApproved ? 'Approved' : isKycSubmitted ? 'Under Review' : 'Not started'}
              value={isKycApproved ? undefined : undefined}
              onPress={!isKycAvailable || isKycApproved ? undefined : () => setShowKyc(true)}
            />
            <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
            <MenuItem C={C}
              icon={<Ionicons name="log-out-outline" size={18} color={C.error} />}
              label="Logout"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        {/* Version */}
        <View style={styles.versionRow}>
          <MaterialIcons name="local-shipping" size={14} color={C.textMuted} />
          <Text style={[styles.version, { color: C.textMuted }]}>CarryGo v1.0 · Peer-to-Peer Logistics</Text>
        </View>
        </Animated.View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },

  heroCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, overflow: 'hidden', position: 'relative',
    marginTop: Spacing.md,
  },
  heroTop: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  avatarRing: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontWeight: FontWeight.bold },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1,
    marginTop: 4,
  },
  editBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  profileName: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  profileEmail: { fontSize: FontSize.sm },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1, marginTop: 4,
  },
  memberText: { fontSize: FontSize.xs },

  kycBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  kycIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  kycTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  kycBody: { fontSize: FontSize.xs, lineHeight: 18, marginTop: 2 },
  kycCta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
  },
  kycCtaText: { fontSize: FontSize.xs, color: '#fff', fontWeight: FontWeight.bold },
  pendingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  pendingBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1 },
  statIconBg: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statVal: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  statLabel: { fontSize: 9, fontWeight: FontWeight.medium },

  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8, marginLeft: 2 },
  menuCard: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: Spacing.md, minHeight: 60,
  },
  menuIconWrap: { alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  menuSubtitle: { fontSize: FontSize.xs, marginTop: 1 },
  menuValue: { fontSize: FontSize.sm },
  div: { height: 1, marginLeft: Spacing.md + 36 + Spacing.md },
  menuBadge: { borderRadius: BorderRadius.full, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  menuBadgeText: { fontSize: FontSize.xs, color: '#fff', fontWeight: FontWeight.bold },

  versionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: Spacing.sm,
  },
  version: { fontSize: FontSize.xs },
});
