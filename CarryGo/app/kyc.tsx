import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown, FadeInUp, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { KycDocumentType, KycIdType } from '@/types';
import { createKycSession, uploadKycDocument, submitKycSession } from '@/services/kyc.service';
import KycStepIndicator from '@/components/feature/kyc/KycStepIndicator';
import DocumentPicker from '@/components/feature/kyc/DocumentPicker';

type KycStep = 'intro' | 'id_front' | 'id_back' | 'selfie' | 'address_proof' | 'review' | 'submitting';

const STEPS: KycStep[] = ['intro', 'id_front', 'id_back', 'selfie', 'address_proof', 'review', 'submitting'];
const TOTAL_STEPS = STEPS.length;

interface DocumentImages {
  id_front: string | null;
  id_back: string | null;
  selfie: string | null;
  address_proof: string | null;
}

export default function KycScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { C, S } = useThemeColors();

  const [step, setStep] = useState<KycStep>('intro');
  const [images, setImages] = useState<DocumentImages>({
    id_front: null,
    id_back: null,
    selfie: null,
    address_proof: null,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const currentStepIndex = STEPS.indexOf(step);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex]);
    }
  }, [currentStepIndex]);

  const goBack = useCallback(() => {
    if (currentStepIndex === 0) {
      router.back();
      return;
    }
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex]);
    }
  }, [currentStepIndex, router]);

  const handleCapture = useCallback((docType: KycDocumentType, uri: string) => {
    setImages(prev => ({ ...prev, [docType]: uri }));
    goNext();
  }, [goNext]);

  const handleRetake = useCallback((docType: KycDocumentType) => {
    setImages(prev => ({ ...prev, [docType]: null }));
  }, []);

  const handleRetakeFromReview = useCallback((docType: KycDocumentType) => {
    setImages(prev => ({ ...prev, [docType]: null }));
    setStep(docType);
  }, []);

  const isSubmittingRef = useRef(false);

  const handleSubmit = useCallback(async () => {
    if (!user || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setStep('submitting');
    setUploadProgress(0);
    setUploadError(null);

    try {
      const sessionResult = await createKycSession(user.id, user.name || user.fullName || '', 'aadhaar' as KycIdType);
      if (sessionResult.error || !sessionResult.data) {
        setUploadError(sessionResult.error || 'Failed to create session');
        return;
      }

      const sessionId = sessionResult.data.sessionId;
      const docTypes: KycDocumentType[] = ['id_front', 'id_back', 'selfie', 'address_proof'];

      for (let i = 0; i < docTypes.length; i++) {
        const docType = docTypes[i];
        const uri = images[docType];
        if (!uri) {
          setUploadError(`Missing image for ${docType.replace('_', ' ')}`);
          return;
        }

        const uploadResult = await uploadKycDocument(sessionId, user.id, docType, uri);
        if (uploadResult.error) {
          setUploadError(uploadResult.error);
          return;
        }
        setUploadProgress(((i + 1) / docTypes.length) * 80);
      }

      const submitResult = await submitKycSession(sessionId, user.id);
      if (submitResult.error) {
        setUploadError(submitResult.error);
        return;
      }

      setUploadProgress(100);
      updateUser({ kycStatus: 'submitted' });
      setIsComplete(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setUploadError(message);
    } finally {
      isSubmittingRef.current = false;
    }
  }, [user, images, updateUser]);

  const renderIntro = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.introContainer}>
      <View style={[styles.introIconCircle, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons name="verified-user" size={48} color={C.primary} />
      </View>

      <Text style={[styles.introTitle, { color: C.textPrimary }]}>Identity Verification</Text>
      <Text style={[styles.introSubtitle, { color: C.textSecondary }]}>
        Complete your KYC to unlock all CarryGo features. This process takes about 2 minutes.
      </Text>

      <View style={styles.introSteps}>
        {[
          { icon: 'credit-card' as const, label: 'Front of ID card' },
          { icon: 'flip' as const, label: 'Back of ID card' },
          { icon: 'face' as const, label: 'Selfie holding your ID' },
          { icon: 'home' as const, label: 'Address proof (utility bill / bank statement)' },
        ].map((item, index) => (
          <Animated.View
            key={item.label}
            entering={FadeInDown.duration(300).delay(200 + index * 100)}
            style={[styles.introStepRow, { backgroundColor: C.surfaceElevated }]}
          >
            <View style={[styles.introStepIcon, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name={item.icon} size={20} color={C.primary} />
            </View>
            <Text style={[styles.introStepLabel, { color: C.textPrimary }]}>{item.label}</Text>
          </Animated.View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start verification process"
        onPress={goNext}
        style={({ pressed }) => [
          styles.startButton,
          { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
          S.glow,
        ]}
      >
        <Text style={styles.startButtonText}>Start Verification</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#fff" />
      </Pressable>
    </Animated.View>
  );

  const renderDocumentStep = (docType: KycDocumentType) => {
    const configs: Record<KycDocumentType, { title: string; description: string }> = {
      id_front: {
        title: 'Front of ID Card',
        description: 'Take a clear photo of the front side of your government-issued ID (Aadhaar, PAN, Passport, or Driving License).',
      },
      id_back: {
        title: 'Back of ID Card',
        description: 'Take a clear photo of the back side of your ID card. Ensure all text is visible and not obscured.',
      },
      selfie: {
        title: 'Selfie with ID',
        description: 'Take a selfie while holding your ID card next to your face. Both your face and the ID must be clearly visible.',
      },
      address_proof: {
        title: 'Address Proof',
        description: 'Upload a recent utility bill, bank statement, or any document showing your current address (issued within last 3 months).',
      },
    };

    const config = configs[docType];

    return (
      <Animated.View key={docType} entering={SlideInRight.duration(300)} style={styles.documentStepContainer}>
        <DocumentPicker
          title={config.title}
          description={config.description}
          documentType={docType}
          imageUri={images[docType]}
          onCapture={(uri) => handleCapture(docType, uri)}
          onRetake={() => handleRetake(docType)}
        />

        {images[docType] ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.nextButtonContainer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue to next step"
              onPress={goNext}
              style={({ pressed }) => [
                styles.nextButton,
                { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
          </Animated.View>
        ) : null}
      </Animated.View>
    );
  };

  const renderReview = () => {
    const docs: { type: KycDocumentType; label: string }[] = [
      { type: 'id_front', label: 'ID Front' },
      { type: 'id_back', label: 'ID Back' },
      { type: 'selfie', label: 'Selfie' },
      { type: 'address_proof', label: 'Address Proof' },
    ];

    return (
      <Animated.View entering={FadeInDown.duration(400)} style={styles.reviewContainer}>
        <Text style={[styles.reviewTitle, { color: C.textPrimary }]}>Review Your Documents</Text>
        <Text style={[styles.reviewSubtitle, { color: C.textSecondary }]}>
          Make sure all images are clear and readable before submitting.
        </Text>

        <View style={styles.reviewGrid}>
          {docs.map((doc, index) => (
            <Animated.View
              key={doc.type}
              entering={ZoomIn.duration(300).delay(index * 100)}
              style={[styles.reviewCard, { backgroundColor: C.surfaceElevated }]}
            >
              {images[doc.type] ? (
                <Image source={{ uri: images[doc.type]! }} style={styles.reviewImage} contentFit="cover" transition={200} />
              ) : (
                <View style={[styles.reviewPlaceholder, { backgroundColor: C.surfaceHigh }]}>
                  <MaterialIcons name="image" size={24} color={C.textMuted} />
                </View>
              )}
              <View style={styles.reviewCardFooter}>
                <Text style={[styles.reviewCardLabel, { color: C.textPrimary }]} numberOfLines={1}>{doc.label}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Retake ${doc.label}`}
                  onPress={() => handleRetakeFromReview(doc.type)}
                  hitSlop={8}
                >
                  <MaterialIcons name="refresh" size={18} color={C.primary} />
                </Pressable>
              </View>
            </Animated.View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Submit documents for verification"
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
            S.glow,
          ]}
        >
          <MaterialIcons name="send" size={18} color="#fff" />
          <Text style={styles.submitButtonText}>Submit for Verification</Text>
        </Pressable>
      </Animated.View>
    );
  };

  const renderSubmitting = () => {
    if (isComplete) {
      return (
        <Animated.View entering={ZoomIn.duration(400)} style={styles.submittingContainer}>
          <View style={[styles.successCircle, { backgroundColor: C.successSubtle }]}>
            <MaterialIcons name="check-circle" size={64} color={C.success} />
          </View>
          <Text style={[styles.submittingTitle, { color: C.textPrimary }]}>Submitted Successfully</Text>
          <Text style={[styles.submittingSubtitle, { color: C.textSecondary }]}>
            Your documents have been submitted for review. You will be notified once the verification is complete (usually 24-48 hours).
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to home"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.doneButton,
              { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </Animated.View>
      );
    }

    if (uploadError) {
      return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.submittingContainer}>
          <View style={[styles.errorCircle, { backgroundColor: C.errorSubtle }]}>
            <MaterialIcons name="error-outline" size={64} color={C.error} />
          </View>
          <Text style={[styles.submittingTitle, { color: C.textPrimary }]}>Upload Failed</Text>
          <Text style={[styles.submittingSubtitle, { color: C.textSecondary }]}>{uploadError}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry submission"
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.doneButton,
              { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <MaterialIcons name="refresh" size={18} color="#fff" />
            <Text style={styles.doneButtonText}>Retry</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back to review"
            onPress={() => setStep('review')}
            style={({ pressed }) => [
              styles.secondaryButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: C.primary }]}>Back to Review</Text>
          </Pressable>
        </Animated.View>
      );
    }

    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.submittingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[styles.submittingTitle, { color: C.textPrimary }]}>Uploading Documents</Text>
        <Text style={[styles.submittingSubtitle, { color: C.textSecondary }]}>
          Please wait while we securely upload your documents...
        </Text>

        <View style={[styles.progressBarBg, { backgroundColor: C.surfaceElevated }]}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { backgroundColor: C.primary, width: `${uploadProgress}%` },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: C.textMuted }]}>{Math.round(uploadProgress)}%</Text>
      </Animated.View>
    );
  };

  const renderContent = () => {
    switch (step) {
      case 'intro': return renderIntro();
      case 'id_front': return renderDocumentStep('id_front');
      case 'id_back': return renderDocumentStep('id_back');
      case 'selfie': return renderDocumentStep('selfie');
      case 'address_proof': return renderDocumentStep('address_proof');
      case 'review': return renderReview();
      case 'submitting': return renderSubmitting();
      default: return null;
    }
  };

  const showBackButton = step !== 'submitting' || uploadError !== null;

  return (
    <View style={[styles.screen, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInUp.duration(300)} style={styles.header}>
        {showBackButton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goBack}
            style={[styles.backButton, { backgroundColor: C.surfaceElevated }]}
            hitSlop={8}
          >
            <MaterialIcons name="arrow-back" size={22} color={C.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}

        <KycStepIndicator currentStep={currentStepIndex} totalSteps={TOTAL_STEPS} />

        <View style={styles.backButton} />
      </Animated.View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },

  // Intro
  introContainer: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.xl,
  },
  introIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  introTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  introSteps: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  introStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  introStepIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introStepLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  startButtonText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },

  // Document step
  documentStepContainer: {
    flex: 1,
    gap: Spacing.lg,
  },
  nextButtonContainer: {
    marginTop: Spacing.md,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },

  // Review
  reviewContainer: {
    gap: Spacing.md,
  },
  reviewTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  reviewSubtitle: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  reviewCard: {
    width: '48%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  reviewImage: {
    width: '100%',
    height: 120,
  },
  reviewPlaceholder: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  reviewCardLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },

  // Submitting
  submittingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.md,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittingTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  submittingSubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
  },
  secondaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
