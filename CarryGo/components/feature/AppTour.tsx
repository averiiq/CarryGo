import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

const TOUR_KEY = 'carrygo_app_tour_seen';
const CARD_MAX_WIDTH = 340;
const CARD_SIDE_GAP = 20;
const SPOTLIGHT_PAD = 10;

export type AppTourTargetId =
  | 'search'
  | 'notifications'
  | 'profileAvatar'
  | 'sendParcel'
  | 'postTrip'
  | 'activityStats'
  | 'marketplaceTabs'
  | 'filters'
  | 'listings'
  | 'profileCard'
  | 'identity'
  | 'profileStats'
  | 'activityMenu'
  | 'preferencesMenu'
  | 'accountMenu'
  | 'tabRequests'
  | 'tabMessages'
  | 'tabProfile';

type TourTargetRef = React.RefObject<View | null>;

interface TourStep {
  target: AppTourTargetId;
  icon: keyof typeof MaterialIcons.glyphMap;
  accent: string;
  title: string;
  description: string;
  details: string[];
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  onDone: () => void;
  targets?: Partial<Record<AppTourTargetId, TourTargetRef>>;
  variant?: 'home' | 'profile';
  onStepChange?: (target: AppTourTargetId, index: number) => void;
}

const HOME_STEPS: TourStep[] = [
  {
    target: 'search',
    icon: 'search',
    accent: '#4F8EF7',
    title: 'Search anything fast',
    description: 'Use search when you already know a route, city, parcel, traveller, or delivery detail you want to find.',
    details: ['Great for jumping past the feed.', 'Helps you find matching listings without changing filters.'],
  },
  {
    target: 'notifications',
    icon: 'notifications-active',
    accent: '#F04444',
    title: 'Notifications',
    description: 'This keeps important activity visible: new requests, accepted deliveries, route matches, OTP updates, and ratings.',
    details: ['Unread alerts show as a badge.', 'Use Mark all read after reviewing them.'],
  },
  {
    target: 'profileAvatar',
    icon: 'person',
    accent: '#7C3AED',
    title: 'Profile shortcut',
    description: 'Tap your avatar when you want to jump straight to profile, verification status, account controls, and preferences.',
    details: ['Useful when a verification alert needs attention.', 'The full Profile tab is also available in the bottom navigation.'],
  },
  {
    target: 'sendParcel',
    icon: 'inventory-2',
    accent: '#22C55E',
    title: 'Send a parcel',
    description: 'Start here when you need something delivered. Add route, parcel details, photos, weight, and the amount you want to pay.',
    details: ['Travellers on your route can request pickup.', 'Escrow and delivery confirmation protect the handoff flow.'],
  },
  {
    target: 'postTrip',
    icon: 'directions-car',
    accent: '#F59E0B',
    title: 'Post a trip',
    description: 'Use this when you are already travelling and can carry a parcel for someone else.',
    details: ['Set your route, capacity, date, and price per kg.', 'You decide which incoming parcel requests to accept.'],
  },
  {
    target: 'activityStats',
    icon: 'analytics',
    accent: '#8B5CF6',
    title: 'Your quick stats',
    description: 'These cards summarize your active trips, parcel listings, and current rating so you can see your marketplace status quickly.',
    details: ['Tap a stat to jump to the matching action.', 'Rating helps other users decide whether to trust a handoff.'],
  },
  {
    target: 'marketplaceTabs',
    icon: 'view-week',
    accent: '#06B6D4',
    title: 'Switch marketplace views',
    description: 'Trips are useful when you want to send a parcel through a traveller. Parcels are useful when you want to earn by carrying one.',
    details: ['Trips tab is sender-focused.', 'Parcels tab is traveller-focused.'],
  },
  {
    target: 'filters',
    icon: 'tune',
    accent: '#7C3AED',
    title: 'Filter listings',
    description: 'Narrow the marketplace by origin, destination, vehicle type, and route preference.',
    details: ['Active filters show a small dot.', 'Clear filters when the feed looks too empty.'],
  },
  {
    target: 'listings',
    icon: 'dynamic-feed',
    accent: '#15A34A',
    title: 'Browse listings',
    description: 'This feed shows available trips or parcels. Open any card to review route, price, timing, user details, and next actions.',
    details: ['Trip cards help senders choose travellers.', 'Parcel cards help travellers choose deliveries.'],
  },
  {
    target: 'tabRequests',
    icon: 'swap-horiz',
    accent: '#F97316',
    title: 'Requests tab',
    description: 'Manage incoming and outgoing requests here. Travellers accept or reject parcel requests, and senders track their outgoing asks.',
    details: ['Pending actions show a badge.', 'Accepted requests unlock chat and delivery tracking.'],
  },
  {
    target: 'tabMessages',
    icon: 'chat',
    accent: '#0891B2',
    title: 'Messages tab',
    description: 'After a request is accepted, use chat to coordinate pickup time, location, handoff details, and delivery updates.',
    details: ['Unread conversations are highlighted.', 'Keep delivery coordination inside the app.'],
  },
  {
    target: 'tabProfile',
    icon: 'person',
    accent: '#7C3AED',
    title: 'Profile and settings',
    description: 'Profile holds identity status, account actions, route alerts, app theme, activity links, and the replay-tour control.',
    details: ['Check verification availability here.', 'Use preferences to manage alerts and appearance.'],
  },
];

const PROFILE_STEPS: TourStep[] = [
  {
    target: 'profileCard',
    icon: 'account-circle',
    accent: '#7C3AED',
    title: 'Profile identity',
    description: 'This card shows the public identity other users see when they review your trips, parcels, requests, and ratings.',
    details: ['Use Edit to keep your profile accurate.', 'Identity approval visuals only appear when the provider-backed flow exists.'],
  },
  {
    target: 'identity',
    icon: 'verified-user',
    accent: '#F59E0B',
    title: 'Identity verification',
    description: 'CarryGo uses this area to explain whether verification is ready, pending, approved, or temporarily unavailable.',
    details: ['Marketplace listing access depends on this state.', 'No documents are collected until a provider is connected.'],
  },
  {
    target: 'profileStats',
    icon: 'bar-chart',
    accent: '#22C55E',
    title: 'Profile stats',
    description: 'Track rating, trips, parcels, and completed deliveries from one compact row.',
    details: ['These numbers reinforce trust.', 'They also help you spot inactive listings quickly.'],
  },
  {
    target: 'activityMenu',
    icon: 'receipt-long',
    accent: '#06B6D4',
    title: 'Activity and payments',
    description: 'Open your activity history, delivery records, and payment-related screens from this section.',
    details: ['My Activity groups your own listings.', 'Transaction History reflects payment availability.'],
  },
  {
    target: 'preferencesMenu',
    icon: 'settings',
    accent: '#8B5CF6',
    title: 'Preferences',
    description: 'Manage route alerts, theme mode, and replay the guided tour whenever you need a refresher.',
    details: ['Route alerts help with matching routes.', 'The tour replay starts from this settings area.'],
  },
  {
    target: 'accountMenu',
    icon: 'manage-accounts',
    accent: '#F04444',
    title: 'Account controls',
    description: 'Account actions live here, including verification entry points and logout.',
    details: ['Verification state is repeated for quick access.', 'Logout uses a confirmation prompt.'],
  },
  {
    target: 'tabRequests',
    icon: 'swap-horiz',
    accent: '#F97316',
    title: 'Requests tab',
    description: 'Use Requests to respond to senders, track outgoing requests, and move accepted deliveries forward.',
    details: ['Incoming and outgoing requests are separated.', 'Status filters help you find pending or active work.'],
  },
  {
    target: 'tabMessages',
    icon: 'chat',
    accent: '#0891B2',
    title: 'Messages tab',
    description: 'Use Messages once a request has been accepted. It is the coordination space for pickup, transit, and delivery questions.',
    details: ['Unread messages show a badge.', 'Each chat is tied back to a delivery route.'],
  },
  {
    target: 'tabProfile',
    icon: 'person',
    accent: '#7C3AED',
    title: 'Profile tab',
    description: 'Return here for your profile, settings, security status, and account controls.',
    details: ['A red dot can indicate pending verification work.', 'Replay this tour any time from Preferences.'],
  },
];

function getVirtualTarget(target: AppTourTargetId, screenW: number, screenH: number, bottomInset: number): TargetRect | null {
  const tabTargets: Partial<Record<AppTourTargetId, number>> = {
    tabRequests: 1,
    tabMessages: 2,
    tabProfile: 3,
  };
  const tabIndex = tabTargets[target];
  if (tabIndex === undefined) return null;

  const tabBarHeight = Platform.select({ ios: bottomInset + 62, android: bottomInset + 66, default: 72 }) ?? 72;
  const tabWidth = screenW / 4;
  return {
    x: tabWidth * tabIndex + 8,
    y: screenH - tabBarHeight + 8,
    width: tabWidth - 16,
    height: 46,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function getSpotlight(rect: TargetRect, screenW: number, screenH: number): TargetRect {
  const x = clamp(rect.x - SPOTLIGHT_PAD, 4, screenW - 24);
  const y = clamp(rect.y - SPOTLIGHT_PAD, 4, screenH - 24);
  const width = clamp(rect.width + SPOTLIGHT_PAD * 2, 44, screenW - x - 4);
  const height = clamp(rect.height + SPOTLIGHT_PAD * 2, 38, screenH - y - 4);
  return { x, y, width, height };
}

export function AppTour({ visible, onDone, targets, variant = 'home', onStepChange }: Props) {
  const { C, isDark } = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [cardHeight, setCardHeight] = useState(240);

  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const spotlightPulse = useRef(new Animated.Value(0)).current;
  const spotlightGlow = useRef(new Animated.Value(0.6)).current;
  const dotScale = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const steps = variant === 'profile' ? PROFILE_STEPS : HOME_STEPS;
  const current = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const measureCurrentTarget = useCallback(() => {
    const virtualTarget = getVirtualTarget(current.target, screenW, screenH, insets.bottom);
    const targetRef = targets?.[current.target];
    if (!targetRef?.current) {
      setTargetRect(virtualTarget);
      return;
    }
    targetRef.current.measureInWindow((x, y, width, height) => {
      if (width > 1 && height > 1) {
        setTargetRect({ x, y, width, height });
        return;
      }
      setTargetRect(virtualTarget);
    });
  }, [current.target, insets.bottom, screenH, screenW, targets]);

  useEffect(() => {
    if (!visible) return;
    setStepIndex(0);
    overlayAnim.setValue(0);
    Animated.timing(overlayAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [visible, variant, overlayAnim]);

  useEffect(() => {
    if (!visible) return;
    onStepChange?.(current.target, stepIndex);
    setTargetRect(null);

    cardAnim.setValue(0);
    cardScale.setValue(0.92);
    dotScale.setValue(0);

    Animated.parallel([
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 18 }),
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 14 }),
      Animated.spring(dotScale, { toValue: 1, useNativeDriver: true, tension: 250, friction: 10, delay: 200 }),
    ]).start();

    const timer = setTimeout(measureCurrentTarget, 220);
    return () => clearTimeout(timer);
  }, [current.target, cardAnim, cardScale, dotScale, measureCurrentTarget, onStepChange, stepIndex, visible]);

  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(spotlightPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(spotlightPulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(spotlightGlow, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(spotlightGlow, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, [spotlightPulse, spotlightGlow, visible]);

  const spotlight = useMemo(
    () => (targetRect ? getSpotlight(targetRect, screenW, screenH) : null),
    [screenH, screenW, targetRect],
  );

  const cardWidth = Math.min(screenW - CARD_SIDE_GAP * 2, CARD_MAX_WIDTH);
  const cardLeft = Math.max(CARD_SIDE_GAP, (screenW - cardWidth) / 2);
  const topSafe = insets.top + 16;
  const bottomSafe = insets.bottom + 94;
  const belowTop = spotlight ? spotlight.y + spotlight.height + 18 : topSafe;
  const aboveTop = spotlight ? spotlight.y - cardHeight - 18 : topSafe;
  const shouldPlaceAbove = spotlight ? belowTop + cardHeight > screenH - bottomSafe : false;
  const cardTop = spotlight
    ? clamp(shouldPlaceAbove ? aboveTop : belowTop, topSafe, screenH - bottomSafe - cardHeight)
    : clamp((screenH - cardHeight) / 2, topSafe, screenH - bottomSafe - cardHeight);

  const progress = ((stepIndex + 1) / steps.length) * 100;
  const pulseScale = spotlightPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const pulseOpacity = spotlightGlow;
  const shadeColor = isDark ? 'rgba(0,0,0,0.82)' : 'rgba(10,15,30,0.52)';

  const goToStep = (nextStep: number) => {
    if (nextStep < 0 || nextStep >= steps.length) return;
    Haptic.select();
    setStepIndex(nextStep);
  };

  const finishTour = async () => {
    Haptic.success();
    await AsyncStorage.setItem(TOUR_KEY, 'true');
    onDone();
  };

  const skipTour = async () => {
    Haptic.tap();
    await AsyncStorage.setItem(TOUR_KEY, 'true');
    onDone();
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={skipTour}>
      <Animated.View style={[styles.root, { opacity: overlayAnim }]}>
        {spotlight ? (
          <>
            <View style={[styles.shade, { backgroundColor: shadeColor, top: 0, left: 0, right: 0, height: spotlight.y }]} />
            <View style={[styles.shade, { backgroundColor: shadeColor, top: spotlight.y + spotlight.height, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.shade, { backgroundColor: shadeColor, top: spotlight.y, left: 0, width: spotlight.x, height: spotlight.height }]} />
            <View style={[styles.shade, { backgroundColor: shadeColor, top: spotlight.y, left: spotlight.x + spotlight.width, right: 0, height: spotlight.height }]} />

            {/* Outer glow ring */}
            <Animated.View
              pointerEvents="none"
              style={[styles.spotlightGlow, {
                left: spotlight.x - 4,
                top: spotlight.y - 4,
                width: spotlight.width + 8,
                height: spotlight.height + 8,
                borderRadius: Math.min(BorderRadius.xl + 4, Math.max(BorderRadius.md + 4, spotlight.height / 2.5)),
                borderColor: current.accent,
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              }]}
            />

            {/* Inner spotlight border */}
            <Animated.View
              pointerEvents="none"
              style={[styles.spotlightInner, {
                left: spotlight.x,
                top: spotlight.y,
                width: spotlight.width,
                height: spotlight.height,
                borderRadius: Math.min(BorderRadius.xl, Math.max(BorderRadius.md, spotlight.height / 3)),
                borderColor: current.accent,
              }]}
            />
          </>
        ) : (
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: shadeColor, opacity: overlayAnim }]} />
        )}

        {/* Coach Card */}
        <Animated.View
          style={[styles.card, {
            backgroundColor: isDark ? 'rgba(12,12,29,0.96)' : 'rgba(255,255,255,0.97)',
            borderColor: current.accent + '30',
            left: cardLeft,
            top: cardTop,
            width: cardWidth,
            opacity: cardAnim,
            transform: [
              { scale: cardScale },
              { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            ],
          }]}
          onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
        >
          {/* Accent line at top */}
          <View style={[styles.accentLine, { backgroundColor: current.accent }]} />

          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: current.accent + '18' }]}>
              <MaterialIcons name={current.icon} size={20} color={current.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: C.textPrimary }]}>{current.title}</Text>
            </View>
            <Pressable
              onPress={skipTour}
              style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.6 : 1 }]}
              hitSlop={12}
            >
              <Text style={[styles.skipText, { color: C.textMuted }]}>Skip</Text>
            </Pressable>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: C.textSecondary }]}>{current.description}</Text>

          {/* Detail chips */}
          <View style={styles.detailChips}>
            {current.details.map((detail) => (
              <View key={detail} style={[styles.chip, { backgroundColor: current.accent + '0C', borderColor: current.accent + '20' }]}>
                <View style={[styles.chipDot, { backgroundColor: current.accent }]} />
                <Text style={[styles.chipText, { color: C.textSecondary }]}>{detail}</Text>
              </View>
            ))}
          </View>

          {/* Step dots + actions */}
          <View style={styles.footer}>
            <View style={styles.dotsRow}>
              {steps.map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    i === stepIndex
                      ? { backgroundColor: current.accent, width: 20, transform: [{ scale: dotScale }] }
                      : i < stepIndex
                        ? { backgroundColor: current.accent + '60', width: 6 }
                        : { backgroundColor: C.textMuted + '30', width: 6 },
                  ]}
                />
              ))}
            </View>

            <View style={styles.actions}>
              {stepIndex > 0 && (
                <Pressable
                  onPress={() => goToStep(stepIndex - 1)}
                  style={({ pressed }) => [styles.backBtn, { borderColor: C.surfaceBorder, opacity: pressed ? 0.7 : 1 }]}
                >
                  <MaterialIcons name="arrow-back" size={16} color={C.textSecondary} />
                </Pressable>
              )}
              <Pressable
                onPress={isLast ? finishTour : () => goToStep(stepIndex + 1)}
                style={({ pressed }) => [styles.nextBtn, { backgroundColor: current.accent, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.nextText}>{isLast ? 'Done' : 'Next'}</Text>
                <MaterialIcons name={isLast ? 'check' : 'arrow-forward'} size={15} color="#fff" />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export function useAppTour() {
  const [showTour, setShowTour] = useState(false);

  const checkAndShowTour = async () => {
    try {
      const seen = await AsyncStorage.getItem(TOUR_KEY);
      if (!seen) setTimeout(() => setShowTour(true), 700);
    } catch {}
  };

  const hideTour = () => setShowTour(false);
  return { showTour, checkAndShowTour, hideTour };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  shade: { position: 'absolute' },
  spotlightGlow: {
    position: 'absolute',
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  spotlightInner: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  card: {
    position: 'absolute',
    borderRadius: BorderRadius.lg + 4,
    borderWidth: 1,
    padding: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 20,
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  skipBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  skipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  detailChips: {
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm + 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  chipText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.md + 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    height: 36,
    borderRadius: 18,
  },
  nextText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});
