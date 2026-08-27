import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

interface SafetyOnboardingProps {
  visible: boolean;
  onComplete: () => void;
  onClose: () => void;
}

type IconName = keyof typeof MaterialIcons.glyphMap;

const TOTAL_STEPS = 9;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SafetyOnboarding({ visible, onComplete, onClose }: SafetyOnboardingProps) {
  const { C, S } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [checks, setChecks] = useState([false, false, false, false]);

  const allChecked = checks.every(Boolean);

  const goNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection('forward');
      Haptic.tap();
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

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

  const entering = direction === 'forward' ? FadeInRight.duration(300) : FadeInLeft.duration(300);
  const exiting = direction === 'forward' ? FadeOutLeft.duration(200) : FadeOutRight.duration(200);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={currentStep === 0 ? handleClose : goBack}
            style={[styles.headerButton, { backgroundColor: C.surfaceElevated }]}
            hitSlop={12}
          >
            <MaterialIcons
              name={currentStep === 0 ? 'close' : 'arrow-back'}
              size={20}
              color={C.textPrimary}
            />
          </Pressable>

          {/* Progress Bar */}
          <View style={[styles.progressContainer, { backgroundColor: C.surfaceElevated }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: C.primary,
                  width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%`,
                },
              ]}
            />
          </View>

          <Text style={[styles.stepCounter, { color: C.textMuted }]}>
            {currentStep + 1}/{TOTAL_STEPS}
          </Text>
        </View>

        {/* Content */}
        <Animated.View key={currentStep} entering={entering} exiting={exiting} style={styles.content}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {currentStep === 0 && <StepWelcome C={C} />}
            {currentStep === 1 && <StepAllowedItems C={C} />}
            {currentStep === 2 && <StepRestrictedItems C={C} />}
            {currentStep === 3 && <StepFragilePackaging C={C} />}
            {currentStep === 4 && <StepSenderResponsibilities C={C} />}
            {currentStep === 5 && <StepTravelerResponsibilities C={C} />}
            {currentStep === 6 && <StepLiability C={C} />}
            {currentStep === 7 && <StepTrustVerification C={C} />}
            {currentStep === 8 && (
              <StepFinalAgreement
                C={C}
                checks={checks}
                onToggle={toggleCheck}
                onViewTerms={() => router.push('/legal/terms' as never)}
              />
            )}
          </ScrollView>
        </Animated.View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: C.background }]}>
          {currentStep < TOTAL_STEPS - 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue to next step"
              onPress={goNext}
              style={({ pressed }) => [
                styles.continueButton,
                { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 },
                S.glow,
              ]}
            >
              <Text style={styles.continueText}>Continue</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Agree and continue"
              onPress={handleAgree}
              disabled={!allChecked}
              style={({ pressed }) => [
                styles.continueButton,
                {
                  backgroundColor: allChecked ? C.primary : C.surfaceBorderLight,
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
    </Modal>
  );
}

/* ─── Illustration Helpers ─── */

function IconCircle({ icon, color, bg, size = 48 }: { icon: IconName; color: string; bg: string; size?: number }) {
  return (
    <View style={[styles.iconCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <MaterialIcons name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

function IllustrationArea({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <View style={[styles.illustration, { backgroundColor: bg }]}>
      {children}
    </View>
  );
}

/* ─── Step Components ─── */

function StepWelcome({ C }: { C: any }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.primarySubtle}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="shield" color={C.primary} bg={C.surface} size={64} />
        </View>
        <View style={styles.illustrationRow}>
          <IconCircle icon="local-shipping" color={C.accent} bg={C.surface} size={44} />
          <IconCircle icon="verified-user" color={C.success} bg={C.surface} size={44} />
          <IconCircle icon="people" color={C.warning} bg={C.surface} size={44} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Sender Safety Center
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Before you send your first parcel, let’s walk through our safety guidelines. This keeps you, travelers, and the community protected.
      </Text>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <BulletPoint icon="timer" text="Takes about 2 minutes" C={C} />
        <BulletPoint icon="check-circle" text="One-time only — you won't see this again" C={C} />
        <BulletPoint icon="security" text="Required for your first shipment" C={C} />
      </View>
    </View>
  );
}

function StepAllowedItems({ C }: { C: any }) {
  const items: { icon: IconName; label: string; color: string }[] = [
    { icon: 'description', label: 'Documents', color: '#8B5CF6' },
    { icon: 'devices', label: 'Electronics', color: '#06B6D4' },
    { icon: 'checkroom', label: 'Clothing', color: '#F59E0B' },
    { icon: 'card-giftcard', label: 'Gifts', color: '#EC4899' },
    { icon: 'menu-book', label: 'Books', color: '#10B981' },
    { icon: 'toys', label: 'Toys', color: '#F97316' },
    { icon: 'local-pharmacy', label: 'OTC Medicine', color: '#EF4444' },
    { icon: 'restaurant', label: 'Packaged Food', color: '#22C55E' },
    { icon: 'spa', label: 'Cosmetics', color: '#D946EF' },
  ];

  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.successSubtle}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="check-circle" color={C.success} bg={C.surface} size={56} />
        </View>
        <View style={styles.illustrationRow}>
          <IconCircle icon="inventory-2" color={C.success} bg={C.surface} size={40} />
          <IconCircle icon="thumb-up" color={C.success} bg={C.surface} size={40} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        What You Can Send
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        These items are allowed on CarryGo. Make sure they’re properly packed and clearly described.
      </Text>

      <View style={styles.itemGrid}>
        {items.map((item) => (
          <View key={item.label} style={[styles.itemCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <View style={[styles.itemIconBox, { backgroundColor: item.color + '18' }]}>
              <MaterialIcons name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={[styles.itemLabel, { color: C.textPrimary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StepRestrictedItems({ C }: { C: any }) {
  const items: { icon: IconName; label: string }[] = [
    { icon: 'local-fire-department', label: 'Flammables' },
    { icon: 'science', label: 'Chemicals' },
    { icon: 'medication', label: 'Narcotics' },
    { icon: 'gavel', label: 'Weapons' },
    { icon: 'money', label: 'Cash / Currency' },
    { icon: 'badge', label: 'Fake IDs' },
    { icon: 'battery-alert', label: 'Loose Batteries' },
    { icon: 'pets', label: 'Live Animals' },
    { icon: 'warning', label: 'Explosives' },
  ];

  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.errorSubtle}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="block" color={C.error} bg={C.surface} size={56} />
        </View>
        <View style={styles.illustrationRow}>
          <IconCircle icon="dangerous" color={C.error} bg={C.surface} size={40} />
          <IconCircle icon="do-not-disturb" color={C.error} bg={C.surface} size={40} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Prohibited Items
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        These items are strictly forbidden. Violations may result in permanent account suspension and legal action.
      </Text>

      <View style={styles.itemGrid}>
        {items.map((item) => (
          <View key={item.label} style={[styles.itemCard, { backgroundColor: C.errorSubtle, borderColor: C.error + '33' }]}>
            <View style={[styles.itemIconBox, { backgroundColor: C.error + '20' }]}>
              <MaterialIcons name={item.icon} size={22} color={C.error} />
            </View>
            <Text style={[styles.itemLabel, { color: C.textPrimary }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.warningBox, { backgroundColor: C.warningSubtle, borderColor: C.warning + '55' }]}>
        <MaterialIcons name="report-problem" size={20} color={C.warning} />
        <Text style={[styles.warningText, { color: C.textSecondary }]}>
          Sending prohibited items is a criminal offense under Indian law. Your account will be permanently banned.
        </Text>
      </View>
    </View>
  );
}

function StepFragilePackaging({ C }: { C: any }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.infoSubtle}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="inventory" color={C.info} bg={C.surface} size={56} />
        </View>
        <View style={styles.illustrationRow}>
          <IconCircle icon="bubble-chart" color={C.info} bg={C.surface} size={36} />
          <IconCircle icon="layers" color={C.info} bg={C.surface} size={36} />
          <IconCircle icon="all-inbox" color={C.info} bg={C.surface} size={36} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Packaging Tips
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Proper packaging protects your items during transit. Follow these guidelines for safe delivery.
      </Text>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <BulletPoint icon="check" text="Use bubble wrap for fragile electronics" C={C} />
        <BulletPoint icon="check" text="Double-box items with glass or ceramics" C={C} />
        <BulletPoint icon="check" text="Fill empty space with padding material" C={C} />
        <BulletPoint icon="check" text="Seal with strong packing tape on all edges" C={C} />
        <BulletPoint icon="check" text="Label 'FRAGILE' clearly on the outside" C={C} />
        <BulletPoint icon="check" text="Waterproof with a plastic inner layer" C={C} />
      </View>

      <View style={[styles.warningBox, { backgroundColor: C.warningSubtle, borderColor: C.warning + '55' }]}>
        <MaterialIcons name="info-outline" size={20} color={C.warning} />
        <Text style={[styles.warningText, { color: C.textSecondary }]}>
          Poor packaging may void damage claims. The traveler is not responsible for damage due to insufficient packing.
        </Text>
      </View>
    </View>
  );
}

function StepSenderResponsibilities({ C }: { C: any }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.primarySubtle}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="person" color={C.primary} bg={C.surface} size={56} />
        </View>
        <View style={styles.illustrationRow}>
          <IconCircle icon="assignment-turned-in" color={C.primary} bg={C.surface} size={38} />
          <IconCircle icon="handshake" color={C.primary} bg={C.surface} size={38} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Your Responsibilities
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        As a sender, you agree to the following obligations on every shipment.
      </Text>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <BulletPoint icon="description" text="Accurately describe your parcel contents" C={C} />
        <BulletPoint icon="straighten" text="Provide correct weight and dimensions" C={C} />
        <BulletPoint icon="inventory" text="Package items securely and appropriately" C={C} />
        <BulletPoint icon="schedule" text="Be on time for handover at agreed location" C={C} />
        <BulletPoint icon="photo-camera" text="Take photos of the parcel before handover" C={C} />
        <BulletPoint icon="currency-rupee" text="Pay the agreed amount — no last-minute haggling" C={C} />
        <BulletPoint icon="phone" text="Stay reachable during the delivery period" C={C} />
      </View>
    </View>
  );
}

function StepTravelerResponsibilities({ C }: { C: any }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.accentSubtle}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="flight" color={C.accent} bg={C.surface} size={56} />
        </View>
        <View style={styles.illustrationRow}>
          <IconCircle icon="luggage" color={C.accent} bg={C.surface} size={38} />
          <IconCircle icon="delivery-dining" color={C.accent} bg={C.surface} size={38} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Traveler’s Role
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Travelers who carry your parcels commit to these standards. Know what to expect.
      </Text>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <BulletPoint icon="verified" text="Identity verified through KYC" C={C} />
        <BulletPoint icon="shield" text="Handle parcels with care during transit" C={C} />
        <BulletPoint icon="photo-camera" text="Confirm pickup and delivery with photos" C={C} />
        <BulletPoint icon="timer" text="Deliver within the agreed timeframe" C={C} />
        <BulletPoint icon="lock" text="Never open or tamper with sealed packages" C={C} />
        <BulletPoint icon="phone-in-talk" text="Communicate proactively about delays" C={C} />
      </View>
    </View>
  );
}

function StepLiability({ C }: { C: any }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.warningSubtle}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="balance" color={C.warning} bg={C.surface} size={56} />
        </View>
        <View style={styles.illustrationRow}>
          <IconCircle icon="gavel" color={C.warning} bg={C.surface} size={38} />
          <IconCircle icon="policy" color={C.warning} bg={C.surface} size={38} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Liability & Risk
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Understand who bears responsibility during each phase of delivery.
      </Text>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <BulletPoint icon="person" text="Sender: responsible for contents & packaging" C={C} />
        <BulletPoint icon="flight" text="Traveler: responsible for safe transit & timely delivery" C={C} />
        <BulletPoint icon="store" text="CarryGo: facilitates connection, holds escrow payments" C={C} />
      </View>

      <View style={[styles.warningBox, { backgroundColor: C.warningSubtle, borderColor: C.warning + '55' }]}>
        <MaterialIcons name="info-outline" size={20} color={C.warning} />
        <Text style={[styles.warningText, { color: C.textSecondary }]}>
          CarryGo is a marketplace platform. We are not a courier service and do not assume carrier liability. Disputes are resolved through our mediation process.
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Maximum Claim Limits</Text>
        <BulletPoint icon="currency-rupee" text="Standard parcels: up to Rs 5,000" C={C} />
        <BulletPoint icon="currency-rupee" text="Electronics: up to Rs 15,000" C={C} />
        <BulletPoint icon="currency-rupee" text="Documents: up to Rs 2,000" C={C} />
      </View>
    </View>
  );
}

function StepTrustVerification({ C }: { C: any }) {
  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.successSubtle}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="verified-user" color={C.success} bg={C.surface} size={56} />
        </View>
        <View style={styles.illustrationRow}>
          <IconCircle icon="fingerprint" color={C.success} bg={C.surface} size={38} />
          <IconCircle icon="qr-code-2" color={C.success} bg={C.surface} size={38} />
          <IconCircle icon="star" color={C.success} bg={C.surface} size={38} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Trust & Verification
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        CarryGo uses multiple layers of verification to keep the community safe.
      </Text>

      <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <BulletPoint icon="badge" text="Government ID verification (KYC)" C={C} />
        <BulletPoint icon="phone-android" text="Phone number verified via OTP" C={C} />
        <BulletPoint icon="photo-camera" text="Photo proof at pickup and delivery" C={C} />
        <BulletPoint icon="pin" text="OTP-based delivery confirmation" C={C} />
        <BulletPoint icon="account-balance-wallet" text="Escrow payment protection" C={C} />
        <BulletPoint icon="star-rate" text="Community ratings and reviews" C={C} />
        <BulletPoint icon="support-agent" text="24/7 dispute resolution support" C={C} />
      </View>
    </View>
  );
}

function StepFinalAgreement({ C, checks, onToggle, onViewTerms }: {
  C: any;
  checks: boolean[];
  onToggle: (index: number) => void;
  onViewTerms: () => void;
}) {
  const checkItems = [
    'I will only send items that are legal and not prohibited',
    'I will package my items securely and describe them accurately',
    'I understand CarryGo is a marketplace, not a courier service',
    'I accept the liability terms and dispute resolution process',
  ];

  return (
    <View style={styles.stepContainer}>
      <IllustrationArea bg={C.primarySubtle}>
        <View style={styles.illustrationRow}>
          <IconCircle icon="handshake" color={C.primary} bg={C.surface} size={56} />
        </View>
        <View style={styles.illustrationRow}>
          <IconCircle icon="task-alt" color={C.success} bg={C.surface} size={38} />
          <IconCircle icon="verified" color={C.primary} bg={C.surface} size={38} />
        </View>
      </IllustrationArea>

      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>
        Almost There!
      </Text>
      <Text style={[styles.stepDescription, { color: C.textSecondary }]}>
        Confirm your understanding by checking each box below. Then you’re ready to send your first parcel.
      </Text>

      <View style={[styles.checkboxCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        {checkItems.map((text, index) => (
          <Pressable
            key={index}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: checks[index] }}
            accessibilityLabel={text}
            onPress={() => onToggle(index)}
            style={[
              styles.checkboxRow,
              index < checkItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.surfaceBorder },
            ]}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: checks[index] ? C.primary : 'transparent',
                  borderColor: checks[index] ? C.primary : C.surfaceBorderLight,
                },
              ]}
            >
              {checks[index] && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
            </View>
            <Text style={[styles.checkboxText, { color: C.textPrimary }]}>{text}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="View full legal policy"
        onPress={onViewTerms}
        style={styles.legalLink}
      >
        <MaterialIcons name="open-in-new" size={14} color={C.primary} />
        <Text style={[styles.legalLinkText, { color: C.primary }]}>View Full Legal Policy</Text>
      </Pressable>
    </View>
  );
}

/* ─── Shared Sub-Components ─── */

function BulletPoint({ icon, text, C }: { icon: IconName; text: string; C: any }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletIcon, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons name={icon} size={16} color={C.primary} />
      </View>
      <Text style={[styles.bulletText, { color: C.textSecondary }]}>{text}</Text>
    </View>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepCounter: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    minWidth: 32,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 54,
    borderRadius: BorderRadius.lg,
  },
  continueText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
  },

  /* Step Container */
  stepContainer: {
    gap: Spacing.lg,
  },

  /* Illustration */
  illustration: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  illustrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Typography */
  stepTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginTop: -Spacing.sm,
  },

  /* Cards */
  infoCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  warningBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },

  /* Item Grid */
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  itemCard: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm * 2) / 3,
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },

  /* Bullet Points */
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bulletIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },

  /* Checkboxes */
  checkboxCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },

  /* Legal Link */
  legalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  legalLinkText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
