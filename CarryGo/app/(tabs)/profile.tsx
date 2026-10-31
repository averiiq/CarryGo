import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  ThemeColors,
  TouchTarget,
  TabBarGeometry,
  StatusBarGeometry,
} from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import KycOnboarding from '@/components/feature/KycOnboarding';
import { LinearGradient } from 'expo-linear-gradient';
import { FeatureFlags } from '@/constants/featureFlags';
import { flattenInfiniteData, useParcelsQuery, useTripsQuery } from '@/features/listings/queries';
import { useRequestsQuery } from '@/features/requests/queries';
import { useResponsive } from '@/hooks/useResponsive';
import { useFadeIn } from '@/hooks/useAnimations';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { AnimatedIcon, type AnimatedIconName, type AnimatedIconRef } from '@/components';
import { resolveImageUrl } from '@/constants/images';

interface MenuItemProps {
  icon?: React.ReactNode;
  animatedIconName?: AnimatedIconName;
  animatedIconColor?: string;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
  C: ThemeColors;
  subtitle?: string;
}

function MenuItem({
  icon,
  animatedIconName,
  animatedIconColor,
  label,
  onPress,
  danger,
  right,
  C,
  subtitle,
}: MenuItemProps) {
  const iconRef = useRef<AnimatedIconRef>(null);

  const handlePress = () => {
    if (onPress) {
      Haptic.tap();
      iconRef.current?.play();
      onPress();
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && { backgroundColor: C.primarySubtle, opacity: 0.9 },
      ]}
      hitSlop={TouchTarget.smallHitSlop}
      onPress={handlePress}
      disabled={!onPress && !right}
    >
      <View
        style={[
          styles.menuIconWrap,
          { backgroundColor: danger ? C.errorSubtle : C.surfaceElevated },
        ]}
      >
        {animatedIconName ? (
          <AnimatedIcon
            ref={iconRef}
            name={animatedIconName}
            size={18}
            color={animatedIconColor || (danger ? C.error : C.primary)}
          />
        ) : (
          icon
        )}
      </View>
      <View style={styles.menuLabelWrap}>
        <Text style={[styles.menuLabel, { color: danger ? C.error : C.textPrimary }]}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.menuSubtitle, { color: C.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? null}
      {onPress && !right ? (
        <MaterialIcons name="chevron-right" size={18} color={C.textMuted} style={{ opacity: 0.6 }} />
      ) : null}
    </Pressable>
  );
}

function MetricsDeck({
  rating,
  totalRatings,
  tripsCount,
  parcelsCount,
  deliveredCount,
  C,
  isSmallDevice,
  onPressActivity,
  onPressRating,
}: {
  rating: number;
  totalRatings: number;
  tripsCount: number;
  parcelsCount: number;
  deliveredCount: number;
  C: ThemeColors;
  isSmallDevice: boolean;
  onPressActivity: () => void;
  onPressRating: () => void;
}) {
  const metrics = [
    {
      label: 'Rating',
      value: totalRatings > 0 ? rating.toFixed(1) : 'New',
      icon: 'star' as const,
      color: '#F59E0B',
      onPress: onPressRating,
    },
    {
      label: 'Trips',
      value: String(tripsCount),
      icon: 'directions-car' as const,
      color: C.primary,
      onPress: onPressActivity,
    },
    {
      label: 'Parcels',
      value: String(parcelsCount),
      icon: 'inventory-2' as const,
      color: C.success,
      onPress: onPressActivity,
    },
    {
      label: 'Delivered',
      value: String(deliveredCount),
      icon: 'check-circle' as const,
      color: '#0EA5E9',
      onPress: onPressActivity,
    },
  ];

  return (
    <View style={[styles.metricsDeck, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      {metrics.map((m, idx) => (
        <React.Fragment key={m.label}>
          {idx > 0 && <View style={[styles.metricDivider, { backgroundColor: C.surfaceBorder }]} />}
          <Pressable
            style={({ pressed }) => [
              styles.metricCell,
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
            ]}
            onPress={() => {
              Haptic.select();
              m.onPress();
            }}
            hitSlop={TouchTarget.smallHitSlop}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: m.color + '15' }]}>
              <MaterialIcons name={m.icon} size={isSmallDevice ? 14 : 16} color={m.color} />
            </View>
            <Text style={[styles.metricValue, { color: C.textPrimary }]} numberOfLines={1}>
              {m.value}
            </Text>
            <Text style={[styles.metricLabel, { color: C.textMuted }]} numberOfLines={1}>
              {m.label}
            </Text>
          </Pressable>
        </React.Fragment>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout, deleteAccount, refreshUser } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useThemeColors();
  const { isSmallDevice, isTablet } = useResponsive();
  const heroEntrance = useFadeIn(0, 300);
  const statsEntrance = useFadeIn(80, 300);
  const sectionsEntrance = useFadeIn(160, 300);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [showKyc, setShowKyc] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const resolvedAvatar = resolveImageUrl(user?.avatar);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  const tripsQuery = useTripsQuery(Boolean(user));
  const parcelsQuery = useParcelsQuery(Boolean(user));
  const requestsQuery = useRequestsQuery(user?.id);
  const scrollRef = useRef<ScrollView | null>(null);

  const {
    isChecking: isCheckingUpdates,
    isDownloading: isDownloadingUpdate,
    isUpdateReady,
    statusMessage: updateStatusMessage,
    checkForUpdate,
    applyUpdate,
  } = useAppUpdates();

  // Refresh user data on focus
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  const trips = useMemo(() => (user ? flattenInfiniteData(tripsQuery.data) : []), [tripsQuery.data, user]);
  const parcels = useMemo(() => (user ? flattenInfiniteData(parcelsQuery.data) : []), [parcelsQuery.data, user]);
  const requests = useMemo(() => (user ? requestsQuery.data ?? [] : []), [requestsQuery.data, user]);

  const myTrips = useMemo(() => trips.filter((t) => t.userId === user?.id), [trips, user?.id]);
  const myParcels = useMemo(() => parcels.filter((p) => p.userId === user?.id), [parcels, user?.id]);
  const completed = useMemo(
    () =>
      requests.filter(
        (r) =>
          (r.senderId === user?.id || r.travellerId === user?.id) &&
          r.status === 'completed'
      ).length,
    [requests, user?.id]
  );

  const handleLogout = () => {
    Haptic.warning();
    showAlert('Sign Out', 'Are you sure you want to sign out of CaryGoo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Haptic.warning();
    showAlert(
      'Delete Account?',
      'This permanently removes your profile, listings, and history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAccount();
            if (result.error) {
              showAlert('Deletion Failed', result.error);
              return;
            }
            showAlert('Account Deleted', 'Your CaryGoo account has been deleted.');
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (!user) return null;

  const displayName = user.fullName || user.name || user.email?.split('@')[0] || 'User';
  const isKycApproved = Boolean(user.kycStatus === 'approved' || user.verified);
  const isKycSubmitted = !isKycApproved && user.kycStatus === 'submitted';
  const isKycAvailable = FeatureFlags.kycProvider;
  const canOpenKycBanner = isKycAvailable && !isKycApproved && !isKycSubmitted;

  const joinedDateFormatted = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'Recent';

  return (
    <>
      <KycOnboarding
        visible={showKyc}
        onClose={() => setShowKyc(false)}
        onComplete={() => {
          setShowKyc(false);
          refreshUser();
        }}
      />
      <Animated.ScrollView
        ref={scrollRef}
        keyboardDismissMode="on-drag"
        style={[styles.container, { backgroundColor: C.background }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: StatusBarGeometry.getHeaderPaddingTop(insets.top, Spacing.sm),
            paddingBottom: TabBarGeometry.getClearance(insets.bottom, isSmallDevice, isTablet),
          },
          isTablet && styles.tabletContainer,
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* ── Executive Identity Header Card ─────────────────────────── */}
        <Animated.View style={{ opacity: heroEntrance.opacity, transform: heroEntrance.transform }}>
          <View
            style={[
              styles.heroCard,
              { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              isSmallDevice && styles.heroCardSmall,
            ]}
          >
            <View style={styles.heroMainRow}>
              {/* Avatar on Left with quick edit badge */}
              <Pressable
                onPress={() => {
                  Haptic.tap();
                  router.push('/edit-profile');
                }}
                style={styles.avatarWrap}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
              >
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: C.primarySubtle, borderColor: C.surfaceBorder },
                  ]}
                >
                  {resolvedAvatar && !avatarError ? (
                    <Image
                      source={{ uri: resolvedAvatar }}
                      style={styles.avatarImage}
                      contentFit="cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <Text style={[styles.avatarText, { color: C.primary }]}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                {isKycApproved ? (
                  <View style={[styles.verifiedCheckBadge, { backgroundColor: C.primary, borderColor: C.surface }]}>
                    <MaterialIcons name="check" size={11} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={[styles.editCameraBadge, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                    <Feather name="edit-2" size={10} color={C.textPrimary} />
                  </View>
                )}
              </Pressable>

              {/* User Identity Details */}
              <View style={styles.heroMetaWrap}>
                <View style={styles.nameAndActionRow}>
                  <Text style={[styles.profileName, { color: C.textPrimary }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptic.tap();
                      router.push('/edit-profile');
                    }}
                    style={({ pressed }) => [
                      styles.quickEditBtn,
                      { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                      pressed && { opacity: 0.8 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile details"
                  >
                    <Feather name="edit-2" size={11} color={C.primary} />
                    <Text style={[styles.quickEditText, { color: C.primary }]}>Edit</Text>
                  </Pressable>
                </View>

                {/* Email row */}
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={12} color={C.textMuted} />
                  <Text style={[styles.infoRowText, { color: C.textMuted }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>

                {/* Status Chips */}
                <View style={styles.chipsRow}>
                  {isKycApproved ? (
                    <View style={[styles.statusChip, { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder }]}>
                      <MaterialIcons name="verified" size={11} color={C.primary} />
                      <Text style={[styles.statusChipText, { color: C.primary }]}>Verified Member</Text>
                    </View>
                  ) : null}

                  {user.city ? (
                    <View style={[styles.locationChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                      <Ionicons name="location-outline" size={11} color={C.textSecondary} />
                      <Text style={[styles.locationChipText, { color: C.textSecondary }]}>{user.city}</Text>
                    </View>
                  ) : null}

                  <View style={[styles.memberPill, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                    <Feather name="calendar" size={10} color={C.textMuted} />
                    <Text style={[styles.memberPillText, { color: C.textMuted }]}>
                      Since {joinedDateFormatted}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Sleek Metrics Deck ───────────────────────────────────────── */}
        <Animated.View style={{ opacity: statsEntrance.opacity, transform: statsEntrance.transform }}>
          <MetricsDeck
            rating={user.rating || 5.0}
            totalRatings={user.totalRatings || 0}
            tripsCount={myTrips.length}
            parcelsCount={myParcels.length}
            deliveredCount={completed}
            C={C}
            isSmallDevice={isSmallDevice}
            onPressActivity={() => router.push('/my-activity')}
            onPressRating={() => {
              showAlert(
                'Trust & Rating',
                user.totalRatings && user.totalRatings > 0
                  ? `Overall Rating: ${(user.rating || 5.0).toFixed(1)}/5.0 across ${user.totalRatings} verified peer reviews.`
                  : 'You have not received ratings yet. Complete delivery trips to build verified trust.'
              );
            }}
          />
        </Animated.View>

        {/* ── KYC Prompt (Only when unverified) ────────────────────────── */}
        {!isKycApproved ? (
          <Pressable
            style={[
              styles.kycBanner,
              {
                backgroundColor: isKycSubmitted ? C.warningSubtle : C.primarySubtle,
                borderColor: isKycSubmitted ? C.warningBorder : C.primaryBorder,
              },
            ]}
            hitSlop={TouchTarget.smallHitSlop}
            onPress={canOpenKycBanner ? () => setShowKyc(true) : undefined}
            disabled={!canOpenKycBanner}
          >
            <View
              style={[
                styles.kycIconWrap,
                { backgroundColor: isKycSubmitted ? C.warning + '22' : C.primary + '22' },
              ]}
            >
              <MaterialIcons
                name={isKycSubmitted ? 'hourglass-empty' : 'shield'}
                size={18}
                color={isKycSubmitted ? C.warning : C.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kycTitle, { color: isKycSubmitted ? C.warning : C.primary }]}>
                {isKycSubmitted ? 'KYC Under Review' : 'Verify Your Identity'}
              </Text>
              <Text style={[styles.kycBody, { color: C.textSecondary }]}>
                {isKycSubmitted
                  ? 'Your documents are being verified within 24 hours.'
                  : 'Unlock unlimited parcel carriage and fast peer matching.'}
              </Text>
            </View>
            {canOpenKycBanner ? (
              <View style={[styles.kycCta, { backgroundColor: C.primary }]}>
                <Text style={styles.kycCtaText}>Verify</Text>
                <MaterialIcons name="arrow-forward" size={11} color="#FFFFFF" />
              </View>
            ) : isKycSubmitted ? (
              <View style={[styles.pendingChip, { backgroundColor: C.warning + '24' }]}>
                <Text style={[styles.pendingChipText, { color: C.warning }]}>Pending</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}

        {/* ── Settings Groups ─────────────────────────────────────────── */}
        <Animated.View style={[styles.sectionsWrap, { opacity: sectionsEntrance.opacity, transform: sectionsEntrance.transform }]}>
          {/* Group 1: Activity & Earnings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Activity & Earnings</Text>
            <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MenuItem
                C={C}
                animatedIconName="activity"
                animatedIconColor={C.primary}
                label="My Activity"
                subtitle={`${myTrips.length} trips • ${myParcels.length} parcels listed`}
                onPress={() => router.push('/my-activity')}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
              <MenuItem
                C={C}
                icon={<MaterialIcons name="receipt-long" size={18} color={C.warning} />}
                label="Transactions & Receipts"
                subtitle="Escrow payments, transfers & invoices"
                onPress={() => router.push('/my-activity?tab=transactions')}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
              <MenuItem
                C={C}
                icon={<MaterialIcons name="monetization-on" size={18} color="#F59E0B" />}
                label="Coins & Rewards"
                subtitle="Earn credits on completed deliveries"
                onPress={() => router.push('/rewards' as any)}
              />
            </View>
          </View>

          {/* Group 2: Preferences & Alerts */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Preferences & Alerts</Text>
            <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MenuItem
                C={C}
                animatedIconName="notification"
                animatedIconColor={C.primary}
                label="Route Alerts"
                subtitle="Corridor notifications for preferred routes"
                onPress={() => router.push('/subscriptions')}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
              <MenuItem
                C={C}
                animatedIconName="settings"
                animatedIconColor={C.info}
                label="Notification Settings"
                subtitle="Push alerts, sound, and SMS updates"
                onPress={() => router.push('/notification-settings' as any)}
              />
            </View>
          </View>

          {/* Group 3: Help & Policies */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Support & Legal</Text>
            <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MenuItem
                C={C}
                animatedIconName="phone"
                animatedIconColor={C.primary}
                label="Help & Support Desk"
                subtitle="24/7 AI chatbot, FAQ, and incident reporting"
                right={
                  <View style={styles.supportTagWrap}>
                    <View style={[styles.onlineTag, { backgroundColor: C.primarySubtle }]}>
                      <View style={[styles.liveDot, { backgroundColor: C.primary }]} />
                      <Text style={[styles.onlineTagText, { color: C.primary }]}>24/7</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={18} color={C.textMuted} style={{ opacity: 0.6 }} />
                  </View>
                }
                onPress={() => router.push('/support' as any)}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
              <MenuItem
                C={C}
                animatedIconName="shield"
                animatedIconColor={C.info}
                label="Terms of Service"
                subtitle="Platform rules, escrow protocols & policies"
                onPress={() => router.push('/legal/terms')}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
              <MenuItem
                C={C}
                animatedIconName="lock"
                animatedIconColor={C.success}
                label="Privacy Policy"
                subtitle="Data protection and privacy encryption"
                onPress={() => router.push('/legal/privacy')}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
              <MenuItem
                C={C}
                animatedIconName="activity"
                animatedIconColor={C.warning}
                label="Refund & Cancellation"
                subtitle="Escrow refunds & cancellation terms"
                onPress={() => router.push('/legal/refund-policy' as any)}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
              <MenuItem
                C={C}
                animatedIconName="package"
                animatedIconColor={C.primary}
                label="Shipping & Delivery"
                subtitle="Peer carriage scope & custody protocols"
                onPress={() => router.push('/legal/shipping-policy' as any)}
              />
            </View>
          </View>

          {/* Group 4: App & Account */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>App & Account</Text>
            <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MenuItem
                C={C}
                icon={<Ionicons name="cloud-download-outline" size={18} color={C.primary} />}
                label="Check for Updates"
                subtitle={
                  isCheckingUpdates
                    ? 'Checking update servers...'
                    : isDownloadingUpdate
                    ? 'Downloading update...'
                    : isUpdateReady
                    ? 'Update ready! Tap to restart'
                    : updateStatusMessage || 'Latest version active'
                }
                right={
                  isCheckingUpdates || isDownloadingUpdate ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : isUpdateReady ? (
                    <View style={[styles.updateReadyBadge, { backgroundColor: C.primary }]}>
                      <Text style={styles.updateReadyText}>Restart</Text>
                    </View>
                  ) : undefined
                }
                onPress={isUpdateReady ? applyUpdate : checkForUpdate}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
              <MenuItem
                C={C}
                icon={<Ionicons name="log-out-outline" size={18} color={C.error} />}
                label="Sign Out"
                subtitle="Sign out of your CaryGoo session"
                onPress={handleLogout}
                danger
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder }]} />
              <MenuItem
                C={C}
                icon={<MaterialIcons name="delete-outline" size={18} color={C.error} />}
                label="Delete Account"
                subtitle="Permanently remove your account and data"
                onPress={handleDeleteAccount}
                danger
              />
            </View>
          </View>

          {/* Clean Footer Branding */}
          <View style={styles.footer}>
            <View style={styles.footerContent}>
              <Image
                source={require('@/assets/images/logo-horizontal.png')}
                style={{ width: 110, height: 34, opacity: 0.85 }}
                contentFit="contain"
              />
              <Text style={[styles.footerText, { color: C.textMuted }]}>CaryGoo v1.2.2 • Move . Connect . Deliver</Text>
            </View>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  tabletContainer: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },

  // Hero Card
  heroCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroCardSmall: {
    padding: Spacing.sm + 2,
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  // Avatar
  avatarWrap: {
    position: 'relative',
    width: 68,
    height: 68,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  editCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Identity Meta
  heroMetaWrap: {
    flex: 1,
    gap: 3,
  },
  nameAndActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    flex: 1,
  },
  quickEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  quickEditText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoRowText: {
    fontSize: FontSize.xs,
    letterSpacing: 0.1,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  locationChipText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  memberPillText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },

  // Metrics Deck
  metricsDeck: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: 4,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
  },
  metricIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  metricValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.2,
  },

  // KYC
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  kycIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.1,
  },
  kycBody: {
    fontSize: FontSize.xs,
    lineHeight: 16,
    marginTop: 1,
  },
  kycCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  kycCtaText: {
    fontSize: FontSize.xs,
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
  },
  pendingChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  pendingChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  // Sections
  sectionsWrap: {
    gap: Spacing.md,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: Spacing.xs,
  },
  menuCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm + 2,
    minHeight: 52,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabelWrap: {
    flex: 1,
    gap: 1,
  },
  menuLabel: {
    fontSize: FontSize.sm + 0.5,
    fontWeight: FontWeight.medium,
    letterSpacing: -0.1,
  },
  menuSubtitle: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
  div: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md + 34 + Spacing.sm + 2,
  },

  supportTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  onlineTagText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },

  updateReadyBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  updateReadyText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.bold,
  },

  // Footer
  footer: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    opacity: 0.6,
  },
});
