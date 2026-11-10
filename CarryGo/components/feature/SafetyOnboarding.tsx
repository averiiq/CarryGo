import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface SafetyOnboardingProps {
  visible: boolean;
  onComplete: () => void;
  onClose: () => void;
  role?: 'sender' | 'traveller';
}

type IconName = keyof typeof MaterialIcons.glyphMap;

export default function SafetyOnboarding({
  visible,
  onComplete,
  onClose,
  role = 'sender',
}: SafetyOnboardingProps) {
  const { C, S } = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isSmallDevice = screenHeight < 720 || screenWidth < 380;
  const router = useRouter();

  const totalSteps = role === 'traveller' ? 6 : 7;

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [checks, setChecks] = useState([false, false, false, false]);

  const allChecked = useMemo(() => checks.every(Boolean), [checks]);

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setDirection('forward');
      Haptic.tap();
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, totalSteps]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection('backward');
      Haptic.tap();
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleAgree = useCallback(() => {
    Haptic.success();
    onComplete();
    setCurrentStep(0);
    setChecks([false, false, false, false]);
  }, [onComplete]);

  const handleClose = useCallback(() => {
    onClose();
    setCurrentStep(0);
    setChecks([false, false, false, false]);
  }, [onClose]);

  const toggleCheck = useCallback((index: number) => {
    Haptic.select();
    setChecks((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const entering = direction === 'forward'
    ? SlideInRight.springify().damping(26).stiffness(320).mass(0.75)
    : SlideInLeft.springify().damping(26).stiffness(320).mass(0.75);
  const exiting = direction === 'forward'
    ? SlideOutLeft.springify().damping(26).stiffness(320).mass(0.75)
    : SlideOutRight.springify().damping(26).stiffness(320).mass(0.75);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-30, 30])
    .onEnd((event) => {
      if (event.translationX < -45 || event.velocityX < -350) {
        if (currentStep < totalSteps - 1) {
          runOnJS(goNext)();
        }
      } else if (event.translationX > 45 || event.velocityX > 350) {
        if (currentStep > 0) {
          runOnJS(goBack)();
        } else {
          runOnJS(handleClose)();
        }
      }
    });

  const progressPercent = Math.min(100, Math.round(((currentStep + 1) / totalSteps) * 100));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
          {/* Top Navigation Header */}
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back or close"
              onPress={() => {
                Haptic.tap();
                if (currentStep === 0) {
                  handleClose();
                } else {
                  goBack();
                }
              }}
              style={({ pressed }) => [
                styles.headerButton,
                {
                  backgroundColor: C.surfaceElevated,
                  borderColor: C.surfaceBorder,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              hitSlop={12}
            >
              <MaterialIcons
                name={currentStep === 0 ? 'close' : 'arrow-back'}
                size={20}
                color={C.textPrimary}
              />
            </Pressable>

            {/* Role & Progress Indicator */}
            <View style={styles.headerCenter}>
              <View style={[styles.roleBadge, { backgroundColor: role === 'traveller' ? C.successSubtle : C.primarySubtle }]}>
                <MaterialIcons
                  name={role === 'traveller' ? 'directions-car' : 'inventory-2'}
                  size={12}
                  color={role === 'traveller' ? C.success : C.primary}
                />
                <Text style={[styles.roleBadgeText, { color: role === 'traveller' ? C.success : C.primary }]}>
                  {role === 'traveller' ? 'Traveller Safety' : 'Sender Safety'}
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: C.surfaceElevated }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: role === 'traveller' ? C.success : C.primary,
                      width: `${progressPercent}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={[styles.stepCountBox, { backgroundColor: C.surfaceElevated }]}>
              <Text style={[styles.stepCounterText, { color: C.textPrimary }]}>
                {currentStep + 1}/{totalSteps}
              </Text>
            </View>
          </View>

          {/* Swipeable Slide Content */}
          <GestureDetector gesture={panGesture}>
            <Animated.View key={currentStep} entering={entering} exiting={exiting} style={styles.content}>
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (isSmallDevice ? 90 : 110) }]}
                showsVerticalScrollIndicator={false}
              >
                {role === 'traveller' ? (
                  <>
                    {currentStep === 0 && <StepTravellerWelcome C={C} isSmallDevice={isSmallDevice} />}
                    {currentStep === 1 && <StepTravellerInspection C={C} isSmallDevice={isSmallDevice} />}
                    {currentStep === 2 && <StepTravellerProhibitedItems C={C} isSmallDevice={isSmallDevice} />}
                    {currentStep === 3 && <StepTravellerLuggageLimits C={C} isSmallDevice={isSmallDevice} />}
                    {currentStep === 4 && <StepTravellerOtpHandover C={C} isSmallDevice={isSmallDevice} />}
                    {currentStep === 5 && (
                      <StepTravellerAgreement
                        C={C}
                        checks={checks}
                        onToggle={toggleCheck}
                        isSmallDevice={isSmallDevice}
                        onViewTerms={() => router.push('/legal/terms' as never)}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {currentStep === 0 && <StepSenderWelcome C={C} isSmallDevice={isSmallDevice} />}
                    {currentStep === 1 && <StepAllowedItems C={C} isSmallDevice={isSmallDevice} />}
                    {currentStep === 2 && <StepRestrictedItems C={C} isSmallDevice={isSmallDevice} />}
                    {currentStep === 3 && <StepFragilePackaging C={C} isSmallDevice={isSmallDevice} />}
                    {currentStep === 4 && <StepSenderResponsibilities C={C} isSmallDevice={isSmallDevice} />}
                    {currentStep === 5 && <StepTrustVerification C={C} isSmallDevice={isSmallDevice} />}
                    {currentStep === 6 && (
                      <StepSenderFinalAgreement
                        C={C}
                        checks={checks}
                        onToggle={toggleCheck}
                        isSmallDevice={isSmallDevice}
                        onViewTerms={() => router.push('/legal/terms' as never)}
                      />
                    )}
                  </>
                )}
              </ScrollView>
            </Animated.View>
          </GestureDetector>

          {/* Fixed Bottom Action Button */}
          <View
            style={[
              styles.footer,
              {
                paddingBottom: insets.bottom + Spacing.sm,
                backgroundColor: C.background,
                borderTopColor: C.surfaceBorder,
              },
            ]}
          >
            {currentStep < totalSteps - 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue to next safety step"
                onPress={goNext}
                style={({ pressed }) => [
                  styles.continueButton,
                  {
                    backgroundColor: role === 'traveller' ? C.success : C.primary,
                    opacity: pressed ? 0.88 : 1,
                  },
                  S.glow,
                ]}
              >
                <Text style={styles.continueText}>Continue</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agree and complete safety instructions"
                onPress={handleAgree}
                disabled={!allChecked}
                style={({ pressed }) => [
                  styles.continueButton,
                  {
                    backgroundColor: allChecked ? (role === 'traveller' ? C.success : C.primary) : C.surfaceBorder,
                    opacity: pressed && allChecked ? 0.88 : 1,
                  },
                  allChecked && S.glow,
                ]}
              >
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color={allChecked ? '#FFFFFF' : C.textMuted}
                />
                <Text
                  style={[
                    styles.continueText,
                    { color: allChecked ? '#FFFFFF' : C.textMuted },
                  ]}
                >
                  I Agree & Continue
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
 * REUSABLE UI PRIMITIVES & ILLUSTRATIONS
 * ───────────────────────────────────────────────────────────── */

function IconCircle({
  icon,
  color,
  bg,
  size = 46,
}: {
  icon: IconName;
  color: string;
  bg: string;
  size?: number;
}) {
  return (
    <View style={[styles.iconCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <MaterialIcons name={icon} size={size * 0.52} color={color} />
    </View>
  );
}

function IllustrationArea({
  children,
  bg,
  isSmall,
}: {
  children: React.ReactNode;
  bg: string;
  isSmall?: boolean;
}) {
  return (
    <View style={[styles.illustration, { backgroundColor: bg, height: isSmall ? 100 : 130 }]}>
      {children}
    </View>
  );
}

function BulletPoint({
  icon,
  text,
  C,
  boldPrefix,
}: {
  icon: IconName;
  text: string;
  C: any;
  boldPrefix?: string;
}) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletIconBox, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons name={icon} size={15} color={C.primary} />
      </View>
      <Text style={[styles.bulletText, { color: C.textSecondary }]}>
        {boldPrefix ? <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>{boldPrefix} </Text> : null}
        {text}
      </Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
 * SENDER SAFETY FLOW (7 STEPS)
 * ───────────────────────────────────────────────────────────── */

function StepSenderWelcome({ C, isSmallDevice }: { C: any; isSmallDevice: boolean }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.primarySubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="verified-user" color={C.primary} bg={C.surface} size={isSmallDevice ? 48 : 58} />
        </View>
        <View style={styles.illustrationRow}>
          <IconCircle icon="local-shipping" color={C.primary} bg={C.surface} size={isSmallDevice ? 34 : 40} />
          <IconCircle icon="lock" color={C.success} bg={C.surface} size={isSmallDevice ? 34 : 40} />
          <IconCircle icon="shield" color="#F59E0B" bg={C.surface} size={isSmallDevice ? 34 : 40} />
        </View>
      </IllustrationArea>

      <View style={styles.badgeRow}>
        <View style={[styles.trustTag, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="security" size={13} color={C.primary} />
          <Text style={[styles.trustTagText, { color: C.primary }]}>CaryGoo SafeSend</Text>
        </View>
        <View style={[styles.trustTag, { backgroundColor: C.successSubtle }]}>
          <MaterialIcons name="verified" size={13} color={C.success} />
          <Text style={[styles.trustTagText, { color: C.success }]}>KYC Protected</Text>
        </View>
      </View>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Sender Safety Center
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Before sending parcels, review these safety guidelines. They keep you, travellers, and your goods 100% protected on every journey.
      </Text>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <BulletPoint icon="timer" text="Takes under 2 minutes to review" C={C} boldPrefix="Quick:" />
        <BulletPoint icon="check-circle" text="Verified travellers with mandatory Govt. ID" C={C} boldPrefix="Trusted:" />
        <BulletPoint icon="shield" text="Dual OTP verification releases payment safely" C={C} boldPrefix="Secure:" />
      </View>
    </View>
  );
}

function StepAllowedItems({ C, isSmallDevice }: { C: any; isSmallDevice: boolean }) {
  const items: { icon: IconName; label: string; color: string }[] = [
    { icon: 'description', label: 'Documents', color: '#8B5CF6' },
    { icon: 'devices', label: 'Tech & Gadgets', color: '#06B6D4' },
    { icon: 'checkroom', label: 'Clothing', color: '#F59E0B' },
    { icon: 'card-giftcard', label: 'Gifts & Boxes', color: '#EC4899' },
    { icon: 'menu-book', label: 'Books', color: '#10B981' },
    { icon: 'local-pharmacy', label: 'OTC Medicine', color: '#EF4444' },
    { icon: 'restaurant', label: 'Packaged Food', color: '#22C55E' },
    { icon: 'inventory-2', label: 'Personal Goods', color: '#6366F1' },
  ];

  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.successSubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="check-circle" color={C.success} bg={C.surface} size={isSmallDevice ? 46 : 56} />
          <IconCircle icon="inventory" color={C.success} bg={C.surface} size={isSmallDevice ? 36 : 42} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        What You Can Send
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Only send packaged personal goods that you can clearly describe and show to the traveller upon pickup.
      </Text>

      <View style={styles.itemGrid}>
        {items.map((item) => (
          <View key={item.label} style={[styles.itemCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={[styles.itemIconBox, { backgroundColor: item.color + '18' }]}>
              <MaterialIcons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={[styles.itemLabel, { color: C.textPrimary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StepRestrictedItems({ C, isSmallDevice }: { C: any; isSmallDevice: boolean }) {
  const items: { icon: IconName; label: string }[] = [
    { icon: 'local-fire-department', label: 'Flammables' },
    { icon: 'science', label: 'Chemicals' },
    { icon: 'medication', label: 'Narcotics' },
    { icon: 'gavel', label: 'Weapons' },
    { icon: 'money', label: 'Cash / Currency' },
    { icon: 'badge', label: 'Fake IDs' },
    { icon: 'pets', label: 'Live Animals' },
    { icon: 'warning', label: 'Explosives' },
  ];

  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.errorSubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="block" color={C.error} bg={C.surface} size={isSmallDevice ? 46 : 56} />
          <IconCircle icon="dangerous" color={C.error} bg={C.surface} size={isSmallDevice ? 36 : 42} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Strictly Prohibited Items
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Contraband or hazardous items are illegal. Attempting to send prohibited goods results in an instant permanent ban and police reporting.
      </Text>

      <View style={styles.itemGrid}>
        {items.map((item) => (
          <View key={item.label} style={[styles.itemCard, { backgroundColor: C.errorSubtle, borderColor: C.errorBorder || C.surfaceBorder }]}>
            <View style={[styles.itemIconBox, { backgroundColor: C.error + '18' }]}>
              <MaterialIcons name={item.icon} size={20} color={C.error} />
            </View>
            <Text style={[styles.itemLabel, { color: C.textPrimary }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.warningBox, { backgroundColor: C.warningSubtle, borderColor: C.warning + '55' }]}>
        <MaterialIcons name="report-problem" size={18} color={C.warning} />
        <Text style={[styles.warningText, { color: C.textSecondary }]}>
          Sending contraband violates Indian transit laws. Travellers have legal instructions to refuse and report suspicious packages.
        </Text>
      </View>
    </View>
  );
}

function StepFragilePackaging({ C, isSmallDevice }: { C: any; isSmallDevice: boolean }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.primarySubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="inventory" color={C.primary} bg={C.surface} size={isSmallDevice ? 46 : 56} />
          <IconCircle icon="layers" color={C.primary} bg={C.surface} size={isSmallDevice ? 36 : 42} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Packaging & Handover Readiness
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Proper packaging ensures your items withstand standard intercity transit without damage.
      </Text>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <BulletPoint icon="check" text="Use bubble wrap or padding for delicate electronics" C={C} boldPrefix="Cushion:" />
        <BulletPoint icon="check" text="Leave package unsealed for traveler inspection at pickup" C={C} boldPrefix="Inspectable:" />
        <BulletPoint icon="check" text="Seal tightly with tape together after physical inspection" C={C} boldPrefix="Seal:" />
        <BulletPoint icon="check" text="Mark 'FRAGILE' clearly on the exterior box" C={C} boldPrefix="Label:" />
      </View>
    </View>
  );
}

function StepSenderResponsibilities({ C, isSmallDevice }: { C: any; isSmallDevice: boolean }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.primarySubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="handshake" color={C.primary} bg={C.surface} size={isSmallDevice ? 46 : 56} />
          <IconCircle icon="assignment-turned-in" color={C.success} bg={C.surface} size={isSmallDevice ? 36 : 42} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Sender Responsibilities
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Key commitments to make handover and delivery effortless:
      </Text>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <BulletPoint icon="schedule" text="Arrive at the pickup spot on time with package ready" C={C} boldPrefix="Punctuality:" />
        <BulletPoint icon="camera-alt" text="Take a photo of the package together at pickup handover" C={C} boldPrefix="Handover Photo:" />
        <BulletPoint icon="phone-in-talk" text="Stay reachable via chat/phone during scheduled transit" C={C} boldPrefix="Communication:" />
        <BulletPoint icon="pin" text="Share delivery recipient contact for the final delivery OTP" C={C} boldPrefix="Recipient OTP:" />
      </View>
    </View>
  );
}

function StepTrustVerification({ C, isSmallDevice }: { C: any; isSmallDevice: boolean }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.successSubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="security" color={C.success} bg={C.surface} size={isSmallDevice ? 46 : 56} />
          <IconCircle icon="pin" color={C.success} bg={C.surface} size={isSmallDevice ? 36 : 42} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Dual-OTP Protected Handover
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Our cryptographic dual-OTP mechanism ensures full safety from pickup to final dropoff:
      </Text>

      <View style={[styles.otpFeatureCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={[styles.otpBadge, { backgroundColor: C.primarySubtle }]}>
          <Text style={[styles.otpBadgeText, { color: C.primary }]}>STEP 1: PICKUP OTP</Text>
        </View>
        <Text style={[styles.otpFeatureTitle, { color: C.textPrimary }]}>Handover Custody Lock</Text>
        <Text style={[styles.otpFeatureDesc, { color: C.textSecondary }]}>
          You provide your 4-digit Pickup OTP to the traveller when handing over the parcel. Once entered, parcel tracking goes live.
        </Text>
      </View>

      <View style={[styles.otpFeatureCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={[styles.otpBadge, { backgroundColor: C.successSubtle }]}>
          <Text style={[styles.otpBadgeText, { color: C.success }]}>STEP 2: DELIVERY OTP</Text>
        </View>
        <Text style={[styles.otpFeatureTitle, { color: C.textPrimary }]}>Recipient Verification & Payout</Text>
        <Text style={[styles.otpFeatureDesc, { color: C.textSecondary }]}>
          Only the recipient holds the 6-digit Delivery OTP. When the traveller delivers, the recipient provides this code to release the booking payment.
        </Text>
      </View>
    </View>
  );
}

function StepSenderFinalAgreement({
  C,
  checks,
  onToggle,
  isSmallDevice,
  onViewTerms,
}: {
  C: any;
  checks: boolean[];
  onToggle: (index: number) => void;
  isSmallDevice: boolean;
  onViewTerms: () => void;
}) {
  const checkItems = [
    'I will only send legal, unprohibited, properly described items',
    'I will show contents to the traveller before final sealing at pickup',
    'I will provide the Pickup OTP only after physical handover',
    'I accept CaryGoo peer-to-peer delivery terms and community standards',
  ];

  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.primarySubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="verified" color={C.primary} bg={C.surface} size={isSmallDevice ? 46 : 56} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Sender Safety Commitments
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Please confirm all 4 statements below to proceed with sending your parcel:
      </Text>

      <View style={{ gap: Spacing.sm }}>
        {checkItems.map((text, idx) => {
          const isChecked = checks[idx];
          return (
            <Pressable
              key={text}
              onPress={() => onToggle(idx)}
              style={({ pressed }) => [
                styles.checkRow,
                {
                  backgroundColor: isChecked ? C.primarySubtle : C.surface,
                  borderColor: isChecked ? C.primary : C.surfaceBorder,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: isChecked ? C.primary : C.textMuted,
                    backgroundColor: isChecked ? C.primary : 'transparent',
                  },
                ]}
              >
                {isChecked ? <MaterialIcons name="check" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={[styles.checkText, { color: C.textPrimary }]}>{text}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={onViewTerms} style={styles.legalLink}>
        <Text style={[styles.legalLinkText, { color: C.primary }]}>Read Full Community Terms & Conditions</Text>
        <MaterialIcons name="open-in-new" size={14} color={C.primary} />
      </Pressable>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
 * TRAVELLER SAFETY FLOW (6 STEPS - TRAVELLER ONLY)
 * ───────────────────────────────────────────────────────────── */

function StepTravellerWelcome({ C, isSmallDevice }: { C: any; isSmallDevice: boolean }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.successSubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="directions-car" color={C.success} bg={C.surface} size={isSmallDevice ? 48 : 58} />
        </View>
        <View style={styles.illustrationRow}>
          <IconCircle icon="shield" color={C.success} bg={C.surface} size={isSmallDevice ? 34 : 40} />
          <IconCircle icon="account-balance-wallet" color={C.primary} bg={C.surface} size={isSmallDevice ? 34 : 40} />
          <IconCircle icon="verified" color="#F59E0B" bg={C.surface} size={isSmallDevice ? 34 : 40} />
        </View>
      </IllustrationArea>

      <View style={styles.badgeRow}>
        <View style={[styles.trustTag, { backgroundColor: C.successSubtle }]}>
          <MaterialIcons name="security" size={13} color={C.success} />
          <Text style={[styles.trustTagText, { color: C.success }]}>CaryGoo SafeTravel</Text>
        </View>
        <View style={[styles.trustTag, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="verified" size={13} color={C.primary} />
          <Text style={[styles.trustTagText, { color: C.primary }]}>Traveller Protected</Text>
        </View>
      </View>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Traveller Safety Guide
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Earn money on your travel routes while keeping yourself, your vehicle, and your passengers completely safe and protected.
      </Text>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <BulletPoint icon="visibility" text="You have the legal right and duty to inspect every parcel" C={C} boldPrefix="Inspect:" />
        <BulletPoint icon="block" text="Never accept sealed, opaque, or mystery boxes" C={C} boldPrefix="Zero Risk:" />
        <BulletPoint icon="account-balance-wallet" text="Payouts are held safely and released automatically via Delivery OTP" C={C} boldPrefix="Safe Pay:" />
      </View>
    </View>
  );
}

function StepTravellerInspection({ C, isSmallDevice }: { C: any; isSmallDevice: boolean }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.primarySubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="search" color={C.primary} bg={C.surface} size={isSmallDevice ? 46 : 56} />
          <IconCircle icon="photo-camera" color={C.primary} bg={C.surface} size={isSmallDevice ? 36 : 42} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Inspect Every Package at Pickup
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        The #1 golden rule of CaryGoo travel. You must know exactly what is inside every bag before placing it in your vehicle.
      </Text>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <BulletPoint icon="open-in-browser" text="Ask sender to open the parcel and physically show contents" C={C} boldPrefix="Open & Check:" />
        <BulletPoint icon="do-not-disturb" text="Refuse any pre-taped or opaque parcel if sender refuses to open" C={C} boldPrefix="No Blind Carry:" />
        <BulletPoint icon="camera-alt" text="Snap a quick photo of the items at handover inside the app" C={C} boldPrefix="Photo Proof:" />
        <BulletPoint icon="cancel" text="Cancel with zero penalty if contents look suspicious or differ from listing" C={C} boldPrefix="Penalty-Free Decline:" />
      </View>
    </View>
  );
}

function StepTravellerProhibitedItems({ C, isSmallDevice }: { C: any; isSmallDevice: boolean }) {
  const items: { icon: IconName; label: string }[] = [
    { icon: 'medication', label: 'Drugs / Narcotics' },
    { icon: 'gavel', label: 'Weapons / Ammo' },
    { icon: 'local-fire-department', label: 'Flammables' },
    { icon: 'money', label: 'Cash Bundles' },
    { icon: 'science', label: 'Hazardous Liquids' },
    { icon: 'pets', label: 'Animals / Wildlife' },
    { icon: 'warning', label: 'Explosives' },
    { icon: 'badge', label: 'Fake Papers' },
  ];

  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.errorSubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="gavel" color={C.error} bg={C.surface} size={isSmallDevice ? 46 : 56} />
          <IconCircle icon="block" color={C.error} bg={C.surface} size={isSmallDevice ? 36 : 42} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Prohibited Goods & Traveller Liability
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Under Indian law, whoever is in possession of contraband inside a vehicle or transit baggage can be held legally liable.
      </Text>

      <View style={styles.itemGrid}>
        {items.map((item) => (
          <View key={item.label} style={[styles.itemCard, { backgroundColor: C.errorSubtle, borderColor: C.errorBorder || C.surfaceBorder }]}>
            <View style={[styles.itemIconBox, { backgroundColor: C.error + '18' }]}>
              <MaterialIcons name={item.icon} size={20} color={C.error} />
            </View>
            <Text style={[styles.itemLabel, { color: C.textPrimary }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.warningBox, { backgroundColor: C.warningSubtle, borderColor: C.warning + '55' }]}>
        <MaterialIcons name="security" size={18} color={C.warning} />
        <Text style={[styles.warningText, { color: C.textSecondary }]}>
          Never transport an item on behalf of an unverified person outside CaryGoo. Always verify the sender's identity in the app.
        </Text>
      </View>
    </View>
  );
}

function StepTravellerLuggageLimits({ C, isSmallDevice }: { C: any; isSmallDevice: boolean }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.primarySubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="luggage" color={C.primary} bg={C.surface} size={isSmallDevice ? 46 : 56} />
          <IconCircle icon="straighten" color={C.primary} bg={C.surface} size={isSmallDevice ? 36 : 42} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Vehicle Luggage Limits & Stowage
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Maintain road safety and passenger comfort by keeping packages stowed properly.
      </Text>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <BulletPoint icon="drive-eta" text="Stow parcels securely in car boot, under train berths, or bus storage" C={C} boldPrefix="Secure Stowage:" />
        <BulletPoint icon="visibility" text="Never block rearview mirrors, windows, or driver visibility" C={C} boldPrefix="Clear Driving View:" />
        <BulletPoint icon="fitness-center" text="Stay within your vehicle capacity (kg) — never overload your vehicle" C={C} boldPrefix="Capacity Limits:" />
        <BulletPoint icon="thermostat" text="Keep sensitive items away from direct heat or boot dampness" C={C} boldPrefix="Protection:" />
      </View>
    </View>
  );
}

function StepTravellerOtpHandover({ C, isSmallDevice }: { C: any; isSmallDevice: boolean }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.successSubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="pin" color={C.success} bg={C.surface} size={isSmallDevice ? 46 : 56} />
          <IconCircle icon="account-balance-wallet" color={C.success} bg={C.surface} size={isSmallDevice ? 36 : 42} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Two-Step OTP & Payout Release
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        The OTP system guarantees your safety and guarantees you get paid upon delivery:
      </Text>

      <View style={[styles.otpFeatureCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={[styles.otpBadge, { backgroundColor: C.primarySubtle }]}>
          <Text style={[styles.otpBadgeText, { color: C.primary }]}>STEP 1: PICKUP OTP</Text>
        </View>
        <Text style={[styles.otpFeatureTitle, { color: C.textPrimary }]}>Collect from Sender</Text>
        <Text style={[styles.otpFeatureDesc, { color: C.textSecondary }]}>
          Enter the 4-digit Pickup OTP provided by the sender at pickup. This transfers custody to you and unlocks in-transit tracking.
        </Text>
      </View>

      <View style={[styles.otpFeatureCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={[styles.otpBadge, { backgroundColor: C.successSubtle }]}>
          <Text style={[styles.otpBadgeText, { color: C.success }]}>STEP 2: DELIVERY OTP</Text>
        </View>
        <Text style={[styles.otpFeatureTitle, { color: C.textPrimary }]}>Collect from Recipient to Unlock Pay</Text>
        <Text style={[styles.otpFeatureDesc, { color: C.textSecondary }]}>
          Only the recipient receives the 6-digit Delivery OTP. Entering it instantly completes the delivery and releases the booking payment to your wallet!
        </Text>
      </View>

      <View style={[styles.warningBox, { backgroundColor: C.warningSubtle, borderColor: C.warning + '55' }]}>
        <MaterialIcons name="lock" size={18} color={C.warning} />
        <Text style={[styles.warningText, { color: C.textSecondary }]}>
          Never leave a parcel without entering the recipient's Delivery OTP in the app. The OTP is your guaranteed proof of completion.
        </Text>
      </View>
    </View>
  );
}

function StepTravellerAgreement({
  C,
  checks,
  onToggle,
  isSmallDevice,
  onViewTerms,
}: {
  C: any;
  checks: boolean[];
  onToggle: (index: number) => void;
  isSmallDevice: boolean;
  onViewTerms: () => void;
}) {
  const checkItems = [
    'I will visually inspect all parcel contents with the sender before accepting custody',
    'I will never accept sealed unknown boxes, prohibited goods, or contraband',
    'I will collect and verify the Pickup OTP and recipient Delivery OTP for every trip',
    'I accept CaryGoo community guidelines and independent carrier liability terms',
  ];

  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.successSubtle} isSmall={isSmallDevice}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="verified" color={C.success} bg={C.surface} size={isSmallDevice ? 46 : 56} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Traveller Safety Commitments
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Please confirm all 4 statements below to proceed with posting your trip:
      </Text>

      <View style={{ gap: Spacing.sm }}>
        {checkItems.map((text, idx) => {
          const isChecked = checks[idx];
          return (
            <Pressable
              key={text}
              onPress={() => onToggle(idx)}
              style={({ pressed }) => [
                styles.checkRow,
                {
                  backgroundColor: isChecked ? C.successSubtle : C.surface,
                  borderColor: isChecked ? C.success : C.surfaceBorder,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: isChecked ? C.success : C.textMuted,
                    backgroundColor: isChecked ? C.success : 'transparent',
                  },
                ]}
              >
                {isChecked ? <MaterialIcons name="check" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={[styles.checkText, { color: C.textPrimary }]}>{text}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={onViewTerms} style={styles.legalLink}>
        <Text style={[styles.legalLinkText, { color: C.primary }]}>Read Full Community Terms & Conditions</Text>
        <MaterialIcons name="open-in-new" size={14} color={C.primary} />
      </Pressable>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
 * STYLES
 * ───────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 10,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepCountBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stepCounterText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  stepContainer: {
    gap: Spacing.md,
  },
  illustration: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  illustrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trustTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  trustTagText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  infoCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  itemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  otpFeatureCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 6,
  },
  otpBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  otpBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  otpFeatureTitle: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  otpFeatureDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  legalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  legalLinkText: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: BorderRadius.lg,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
