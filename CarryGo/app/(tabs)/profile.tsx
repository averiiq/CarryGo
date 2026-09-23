import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
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
import { useAppUpdates } from '@/hooks/useAppUpdates';

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
        pressed && { backgroundColor: C.primarySubtle, opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
      hitSlop={TouchTarget.smallHitSlop}
      onPress={() => { if (onPress) { Haptic.tap(); onPress(); } }}
      disabled={!onPress && !right}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: danger ? C.errorSubtle : C.surfaceElevated }]}>
        {icon}
      </View>
      <View style={styles.menuLabelWrap}>
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

function BentoStatCard({
  label,
  value,
  sublabel,
  icon,
  color,
  C,
  onPress,
  iconAnim,
  isSmallDevice,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  C: ThemeColors;
  onPress?: () => void;
  iconAnim?: Animated.Value;
  isSmallDevice?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.statCard,
        isSmallDevice && styles.statCardSmall,
        { backgroundColor: C.surface, borderColor: C.surfaceBorder },
        pressed && onPress && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
      hitSlop={TouchTarget.smallHitSlop}
      onPress={() => {
        if (onPress) {
          Haptic.select();
          onPress();
        }
      }}
      disabled={!onPress}
    >
      <Animated.View
        style={[
          styles.statCardIcon,
          { backgroundColor: color + '16' },
          iconAnim ? { transform: [{ scale: iconAnim }] } : undefined,
        ]}
      >
        <MaterialIcons name={icon} size={isSmallDevice ? 14 : 16} color={color} />
      </Animated.View>
      <View style={styles.statCardContent}>
        <Text
          style={[styles.statCardVal, isSmallDevice && { fontSize: FontSize.md }, { color: C.textPrimary }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Text style={[styles.statCardLabel, { color: C.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={[styles.statCardSublabel, { color: C.textMuted + 'AA' }]} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, logout, deleteAccount, refreshUser } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C, isDark } = useThemeColors();
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

  const {
    isChecking: isCheckingUpdates,
    isDownloading: isDownloadingUpdate,
    isUpdateReady,
    statusMessage: updateStatusMessage,
    checkForUpdate,
    applyUpdate,
  } = useAppUpdates();

  // Automatically refresh profile from database whenever returning to profile tab
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

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
        text: 'Logout',
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
      'Delete account?',
      'This permanently removes your CarryGo account and signs you out. This action cannot be undone.',
      [
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
      ]
    );
  };

  if (!user) return null;

  const displayName = user.fullName || user.name || user.email?.split('@')[0] || 'User';
  const isKycApproved = Boolean(user.kycStatus === 'approved' || user.verified);
  const isKycSubmitted = !isKycApproved && user.kycStatus === 'submitted';
  const isKycAvailable = FeatureFlags.kycProvider;
  const canOpenKycBanner = isKycAvailable && !isKycApproved && !isKycSubmitted;

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

  const kycColor = isKycApproved
    ? C.success
    : isKycSubmitted
    ? C.warning
    : !isKycAvailable
    ? C.warning
    : C.primary;

  const kycBg = isKycApproved
    ? C.successSubtle
    : isKycSubmitted
    ? C.warningSubtle
    : !isKycAvailable
    ? C.warningSubtle
    : C.primarySubtle;

  const kycBorder = isKycApproved
    ? C.successBorder
    : isKycSubmitted
    ? C.warningBorder
    : !isKycAvailable
    ? C.warningBorder
    : C.primaryBorder;

  const kycTitle = isKycApproved
    ? 'Identity Verified'
    : isKycSubmitted
    ? 'KYC Under Review'
    : !isKycAvailable
    ? 'Identity Verification Unavailable'
    : 'Verify Your Identity';

  const kycBody = isKycApproved
    ? 'You are 100% verified to send and carry parcels freely.'
    : isKycSubmitted
    ? 'Usually approved within 24 hours.'
    : !isKycAvailable
    ? disabledFeatureMessage.kyc
    : 'Needed to send or carry parcels - 2 min process.';

  // Format joined date
  const joinedDateFormatted = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'Recent';

  // Format phone display
  const phoneDisplay = user.phone ? user.phone : null;

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
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xs, paddingBottom: insets.bottom + 120 },
          isTablet && styles.tabletContainer,
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Executive Theme-Adaptive Identity Card */}
        <Animated.View
          style={{
            opacity: heroEntrance.opacity,
            transform: [...heroEntrance.transform, { translateY: heroTranslateY }, { scale: heroScale }],
          }}
        >
          <View
            style={[
              styles.heroCard,
              { backgroundColor: C.surface, borderColor: C.surfaceBorder },
              isSmallDevice && styles.heroCardSmall,
            ]}
          >
            {/* Theme-Adaptive Gradient Backing */}
            <LinearGradient
              colors={
                isDark
                  ? [C.surface, C.surfaceElevated, C.surface]
                  : ['#FFFFFF', '#F8FAFC', '#F1F5F9']
              }
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />

            {/* Main Horizontal Identity Block */}
            <View style={styles.heroMainRow}>
              {/* Avatar on Left with Breathing Pulse */}
              <Animated.View style={[styles.avatarOuter, { transform: [{ scale: avatarBreathing }] }]}>
                <LinearGradient
                  colors={[C.primary, C.primaryLight]}
                  style={styles.avatarGradientRing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={[styles.avatarInner, { backgroundColor: C.surface }]}>
                  <View style={[styles.avatar, { backgroundColor: C.primarySubtle }]}>
                    <Text style={[styles.avatarText, { color: C.primary }]}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </View>
                {isKycApproved ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: C.primary, borderColor: C.surface }]}>
                    <MaterialIcons name="check" size={10} color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.onlineDot, { backgroundColor: C.primary, borderColor: C.surface }]} />
                )}
              </Animated.View>

              {/* User Identity Details */}
              <View style={styles.heroMetaWrap}>
                <View style={styles.heroNameRow}>
                  <Text style={[styles.profileName, { color: C.textPrimary }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {isKycApproved ? (
                    <View style={[styles.trustTag, { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder }]}>
                      <MaterialIcons name="verified" size={11} color={C.primary} />
                      <Text style={[styles.trustTagText, { color: C.primary }]}>Verified</Text>
                    </View>
                  ) : null}
                </View>

                {/* Email Row */}
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={12} color={C.textMuted} />
                  <Text style={[styles.infoRowText, { color: C.textMuted }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>

                {/* Phone & City Row */}
                <View style={styles.chipsRow}>
                  {user.city ? (
                    <View style={[styles.locationChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                      <Ionicons name="location-outline" size={11} color={C.primary} />
                      <Text style={[styles.locationChipText, { color: C.textSecondary }]}>{user.city}</Text>
                    </View>
                  ) : null}

                  {phoneDisplay ? (
                    <View style={[styles.locationChip, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                      <Ionicons name="call-outline" size={11} color={C.textMuted} />
                      <Text style={[styles.locationChipText, { color: C.textSecondary }]}>{phoneDisplay}</Text>
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

            {/* Bottom Quick Action Strip */}
            <View style={[styles.heroBottomDivider, { backgroundColor: C.surfaceBorder + '88' }]} />
            <Pressable
              style={({ pressed }) => [
                styles.editProfileFullBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
              ]}
              hitSlop={TouchTarget.smallHitSlop}
              onPress={() => {
                Haptic.tap();
                router.push('/edit-profile');
              }}
            >
              <View style={styles.editBtnLeft}>
                <View style={[styles.editIconCircle, { backgroundColor: C.primarySubtle, borderColor: C.primaryBorder }]}>
                  <Ionicons name="pencil" size={13} color={C.primary} />
                </View>
                <View style={styles.editTextWrap}>
                  <Text style={[styles.editProfileFullBtnText, { color: C.textPrimary }]}>Edit Profile</Text>
                  <Text style={[styles.editProfileSubText, { color: C.textMuted }]}>
                    Update name, phone number, and location
                  </Text>
                </View>
              </View>
              <View style={[styles.editChevronWrap, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                <MaterialIcons name="chevron-right" size={14} color={C.textMuted} />
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Bento Stat Highlights */}
        <Animated.View style={{ opacity: statsEntrance.opacity, transform: statsEntrance.transform }}>
          <View style={styles.statsGrid}>
            <BentoStatCard
              label="Rating"
              value={user.totalRatings && user.totalRatings > 0 ? (user.rating || 5.0).toFixed(1) : 'New'}
              sublabel={user.totalRatings && user.totalRatings > 0 ? `${user.totalRatings} rev` : 'Member'}
              icon="star"
              color={C.warning}
              C={C}
              iconAnim={starHeartbeat}
              isSmallDevice={isSmallDevice}
              onPress={() => {
                showAlert(
                  'User Rating',
                  user.totalRatings && user.totalRatings > 0
                    ? `Current Rating: ${(user.rating || 5.0).toFixed(1)}/5.0 based on ${user.totalRatings} verified peer ${user.totalRatings === 1 ? 'review' : 'reviews'}.`
                    : 'You have not received any delivery ratings yet. Complete delivery trips to build trust and increase match priority.'
                );
              }}
            />
            <BentoStatCard
              label="Trips"
              value={String(myTrips.length)}
              sublabel="Active"
              icon="directions-car"
              color={C.primary}
              C={C}
              isSmallDevice={isSmallDevice}
              onPress={() => router.push('/my-activity')}
            />
            <BentoStatCard
              label="Parcels"
              value={String(myParcels.length)}
              sublabel="Listed"
              icon="inventory-2"
              color={C.success}
              C={C}
              isSmallDevice={isSmallDevice}
              onPress={() => router.push('/my-activity')}
            />
            <BentoStatCard
              label="Delivered"
              value={String(completed)}
              sublabel="Completed"
              icon="check-circle"
              color={C.info}
              C={C}
              isSmallDevice={isSmallDevice}
              onPress={() => router.push('/my-activity')}
            />
          </View>
        </Animated.View>

        {/* Trust & KYC Verification Card */}
        <Pressable
          style={[styles.kycBanner, { backgroundColor: kycBg, borderColor: kycBorder }]}
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
            <Text style={[styles.kycBody, { color: C.textSecondary }]}>{kycBody}</Text>
          </View>
          {canOpenKycBanner ? (
            <View style={[styles.kycCta, { backgroundColor: kycColor }]}>
              <Text style={styles.kycCtaText}>Start</Text>
              <MaterialIcons name="arrow-forward" size={11} color="#fff" />
            </View>
          ) : isKycApproved ? (
            <MaterialIcons name="check-circle" size={22} color={C.success} />
          ) : isKycSubmitted ? (
            <View style={[styles.pendingChip, { backgroundColor: C.warning + '24' }]}>
              <Text style={[styles.pendingChipText, { color: C.warning }]}>In Review</Text>
            </View>
          ) : null}
        </Pressable>

        {/* Organized Settings Groups */}
        <Animated.View style={[styles.sectionsWrap, { opacity: sectionsEntrance.opacity, transform: sectionsEntrance.transform }]}>

          {/* Group 1: Activity & History */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Activity & History</Text>
            <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MenuItem
                C={C}
                icon={<MaterialIcons name="bar-chart" size={18} color={C.primary} />}
                label="My Activity"
                subtitle={`${myTrips.length} trips • ${myParcels.length} parcels`}
                onPress={() => router.push('/my-activity')}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder + '88' }]} />
              <MenuItem
                C={C}
                icon={<MaterialIcons name="receipt-long" size={18} color={C.warning} />}
                label="Transactions & Receipts"
                subtitle={FeatureFlags.payments ? 'Escrow payment history and invoices' : 'Unavailable'}
                onPress={() => router.push('/transactions')}
              />
            </View>
          </View>

          {/* Group 2: Preferences & Alerts */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Preferences & Alerts</Text>
            <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MenuItem
                C={C}
                icon={<MaterialIcons name="notifications-active" size={18} color={C.primary} />}
                label="Route Alerts"
                subtitle="Instant matches for preferred travel corridors"
                onPress={() => router.push('/subscriptions')}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder + '88' }]} />
              <MenuItem
                C={C}
                icon={<MaterialIcons name="tune" size={18} color={C.info} />}
                label="Notification Preferences"
                subtitle="Manage push alerts, sounds, and order updates"
                onPress={() => router.push('/notification-settings' as any)}
              />
            </View>
          </View>

          {/* Group 3: Support & Legal */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Support & Legal</Text>
            <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MenuItem
                C={C}
                icon={<MaterialIcons name="support-agent" size={18} color={C.primary} />}
                label="Help & Support Desk"
                subtitle="FAQs, 24/7 AI Chatbot, incident reporting"
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.onlineTag, { backgroundColor: C.primarySubtle }]}>
                      <View style={[styles.liveDot, { backgroundColor: C.primary }]} />
                      <Text style={[styles.onlineTagText, { color: C.primary }]}>24/7</Text>
                    </View>
                    <View style={[styles.menuChevronWrap, { backgroundColor: C.surfaceElevated }]}>
                      <MaterialIcons name="chevron-right" size={16} color={C.textMuted} />
                    </View>
                  </View>
                }
                onPress={() => router.push('/support' as any)}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder + '88' }]} />
              <MenuItem
                C={C}
                icon={<MaterialIcons name="description" size={18} color={C.info} />}
                label="Terms of Service"
                subtitle="Platform rules, escrow protocols & policies"
                onPress={() => router.push('/legal/terms')}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder + '88' }]} />
              <MenuItem
                C={C}
                icon={<MaterialIcons name="privacy-tip" size={18} color={C.success} />}
                label="Privacy Policy"
                subtitle="Data protection and identity encryption"
                onPress={() => router.push('/legal/privacy')}
              />
            </View>
          </View>

          {/* Group 4: Account & App */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Account & App</Text>
            <View style={[styles.menuCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              <MenuItem
                C={C}
                icon={
                  <MaterialIcons
                    name={isKycApproved ? 'verified' : 'verified-user'}
                    size={18}
                    color={
                      isKycApproved
                        ? C.success
                        : isKycSubmitted
                        ? C.warning
                        : !isKycAvailable
                        ? C.warning
                        : C.error
                    }
                  />
                }
                label="KYC Verification"
                subtitle={
                  isKycApproved
                    ? '100% Officially Verified'
                    : isKycSubmitted
                    ? 'Documents Under Review'
                    : !isKycAvailable
                    ? 'Verification provider unavailable'
                    : 'Not started - Tap to verify'
                }
                right={isKycApproved ? <MaterialIcons name="check-circle" size={18} color={C.success} /> : undefined}
                onPress={!isKycAvailable || isKycApproved ? undefined : () => setShowKyc(true)}
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder + '88' }]} />
              <MenuItem
                C={C}
                icon={<Ionicons name="cloud-download-outline" size={18} color={C.primary} />}
                label="Check for App Updates"
                subtitle={
                  isCheckingUpdates
                    ? 'Checking update servers...'
                    : isDownloadingUpdate
                    ? 'Downloading update...'
                    : isUpdateReady
                    ? 'Update ready! Tap to restart'
                    : updateStatusMessage || 'Latest version active (OTA enabled)'
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
              <View style={[styles.div, { backgroundColor: C.surfaceBorder + '88' }]} />
              <MenuItem
                C={C}
                icon={<MaterialIcons name="delete-outline" size={18} color={C.error} />}
                label="Delete Account"
                subtitle="Permanently remove your profile and data"
                onPress={handleDeleteAccount}
                danger
              />
              <View style={[styles.div, { backgroundColor: C.surfaceBorder + '88' }]} />
              <MenuItem
                C={C}
                icon={<Ionicons name="log-out-outline" size={18} color={C.error} />}
                label="Logout"
                onPress={handleLogout}
                danger
              />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={[styles.footerDivider, { backgroundColor: C.surfaceBorder + '66' }]} />
            <View style={styles.footerContent}>
              <MaterialIcons name="local-shipping" size={13} color={C.textMuted + '99'} />
              <Text style={[styles.footerText, { color: C.textMuted + '99' }]}>CarryGo v1.2.2</Text>
              <View style={[styles.footerDot, { backgroundColor: C.textMuted + '55' }]} />
              <Text style={[styles.footerText, { color: C.textMuted + '99' }]}>Peer-to-Peer Logistics</Text>
            </View>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md + 2 },
  tabletContainer: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },

  // Hero Card
  heroCard: {
    borderRadius: BorderRadius.xl + 4,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md + 2,
    gap: Spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginTop: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  heroCardSmall: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },

  // Avatar
  avatarOuter: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarGradientRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
  },
  avatarInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    elevation: 2,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },

  // Identity Meta
  heroMetaWrap: {
    flex: 1,
    gap: 4,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.4,
  },
  trustTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  trustTagText: {
    fontSize: 10,
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
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
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
    paddingVertical: 2.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  memberPillText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },

  // Bottom action
  heroBottomDivider: { height: 1, marginTop: Spacing.xs },
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

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: Spacing.md - 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 4,
  },
  statCardSmall: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
  },
  statCardIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardContent: { alignItems: 'center', gap: 1 },
  statCardVal: { fontSize: FontSize.md + 1, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  statCardLabel: { fontSize: 9, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  statCardSublabel: { fontSize: 8, fontWeight: FontWeight.regular },

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
  sectionsWrap: { gap: Spacing.lg, marginTop: Spacing.xs },
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
    paddingVertical: Spacing.md - 2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md - 2,
    minHeight: 56,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabelWrap: { flex: 1 },
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

  // Online Tag in Support
  onlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineTagText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },

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
});
