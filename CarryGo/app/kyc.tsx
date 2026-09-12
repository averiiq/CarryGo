import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { AadhaarVerifiedData } from '@/types';
import {
  generateAadhaarOtp,
  verifyAadhaarOtp,
  uploadSelfie,
  verifyPan,
  skipPan,
  completeSandboxKyc,
  fetchLatestKycSession,
} from '@/services/kyc.service';
import KycStepIndicator from '@/components/feature/kyc/KycStepIndicator';
import { Haptic } from '@/services/haptics.service';

type KycStep =
  | 'aadhaar_number'
  | 'aadhaar_otp'
  | 'aadhaar_verified'
  | 'selfie'
  | 'pan'
  | 'completed';

export default function KycScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { C, S } = useThemeColors();

  const [step, setStep] = useState<KycStep>('aadhaar_number');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  // Aadhaar Form State
  const [aadhaarRaw, setAadhaarRaw] = useState('');
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [maskedAadhaar, setMaskedAadhaar] = useState('');

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [registeredMobileEnding, setRegisteredMobileEnding] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(30);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // Verified Data State
  const [aadhaarData, setAadhaarData] = useState<AadhaarVerifiedData | null>(null);

  // Selfie & PAN States
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [panNumber, setPanNumber] = useState('');
  const [isPanVerified, setIsPanVerified] = useState(false);

  // UI Flow States
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Resend Countdown Timer
  useEffect(() => {
    if (step === 'aadhaar_otp' && resendCountdown > 0) {
      timerRef.current = setTimeout(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [step, resendCountdown]);

  // Check if user is already verified on mount
  useEffect(() => {
    if (!user) return;
    if (user.kycStatus === 'approved') {
      setStep('completed');
      return;
    }

    fetchLatestKycSession(user.id).then(({ data: session }) => {
      if (!session) return;
      setSessionId(session.id);

      if (session.status === 'approved') {
        setStep('completed');
      } else if (session.aadhaarStatus === 'verified') {
        if (session.aadhaarName) {
          setAadhaarData({
            referenceId: session.aadhaarReferenceId ?? '',
            name: session.aadhaarName,
            aadhaarNumberMasked: session.aadhaarNumberMasked ?? '•••• •••• ' + (session.aadhaarReferenceId?.slice(-4) || '1234'),
            dob: session.aadhaarDob,
            gender: session.aadhaarGender,
            address: session.aadhaarAddress,
            verifiedAt: session.createdAt,
          });
        }
        if (session.selfieStatus === 'uploaded' || session.selfieStatus === 'verified') {
          setStep('pan');
        } else {
          setStep('selfie');
        }
      }
    });
  }, [user]);

  // Format 12-digit Aadhaar input into 4-digit groups (e.g. 5544 3322 1100)
  const formatAadhaarDisplay = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 12);
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.slice(i, i + 4));
    }
    return parts.join(' ');
  };

  // Seamless Aadhaar change with smart backspacing over space delimiters
  const handleAadhaarChange = useCallback((text: string) => {
    const clean = text.replace(/\D/g, '');
    const currentFormatted = formatAadhaarDisplay(aadhaarRaw);
    if (text.length < currentFormatted.length && clean === aadhaarRaw) {
      setAadhaarRaw(clean.slice(0, -1));
    } else {
      setAadhaarRaw(clean.slice(0, 12));
    }
    if (errorMessage) setErrorMessage(null);
  }, [aadhaarRaw, errorMessage]);

  // Step 1: Send UIDAI OTP to user's Aadhaar-registered mobile
  const handleSendOtp = useCallback(async () => {
    if (!user) return;
    const cleanAadhaar = aadhaarRaw.replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      Haptic.error();
      setErrorMessage('Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    Haptic.tap();
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await generateAadhaarOtp(
        user.id,
        user.name || user.fullName || 'Citizen User',
        cleanAadhaar,
      );

      if (result.error || !result.data) {
        Haptic.error();
        setErrorMessage(result.error ?? 'Failed to send OTP. Please check your Aadhaar number.');
        setIsProcessing(false);
        return;
      }

      Haptic.success();
      setSessionId(result.data.sessionId);
      setReferenceId(result.data.referenceId);
      setMaskedAadhaar(result.data.maskedAadhaar);
      if (result.data.registeredMobileEnding) {
        setRegisteredMobileEnding(result.data.registeredMobileEnding);
      } else {
        setRegisteredMobileEnding(null);
      }
      setResendCountdown(30);
      setStep('aadhaar_otp');
    } catch (err) {
      Haptic.error();
      setErrorMessage(err instanceof Error ? err.message : 'Error sending UIDAI OTP.');
    } finally {
      setIsProcessing(false);
    }
  }, [user, aadhaarRaw]);

  // Step 2: Verify 6-digit OTP received from UIDAI
  const handleVerifyOtp = useCallback(async () => {
    if (!user || !sessionId || !referenceId) return;
    const cleanOtp = otpCode.replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      Haptic.error();
      setErrorMessage('Please enter the 6-digit OTP sent to your registered mobile.');
      return;
    }

    Haptic.confirm();
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await verifyAadhaarOtp(
        sessionId,
        user.id,
        referenceId,
        cleanOtp,
        maskedAadhaar,
      );

      if (result.error || !result.data) {
        Haptic.error();
        setErrorMessage(result.error ?? 'Invalid or expired OTP. Please try again.');
        setIsProcessing(false);
        return;
      }

      Haptic.success();
      setAadhaarData(result.data);
      setStep('aadhaar_verified');
    } catch (err) {
      Haptic.error();
      setErrorMessage(err instanceof Error ? err.message : 'Aadhaar verification error.');
    } finally {
      setIsProcessing(false);
    }
  }, [user, sessionId, referenceId, otpCode, maskedAadhaar]);

  // Step 3: Advance to selfie capture
  const handleProceedToSelfie = useCallback(() => {
    Haptic.tap();
    setStep('selfie');
    setErrorMessage(null);
  }, []);

  // Step 4: Launch front camera for live selfie
  const handleLaunchCamera = useCallback(async () => {
    Haptic.tap();
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Haptic.warning();
        Alert.alert('Camera Required', 'Camera permission is needed to take your live verification selfie.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]?.uri) {
        Haptic.success();
        setSelfieUri(result.assets[0].uri);
        setErrorMessage(null);
      }
    } catch {
      Haptic.error();
      setErrorMessage('Could not launch camera. Please check permissions.');
    }
  }, []);

  // Step 4: Upload selfie
  const handleUploadSelfie = useCallback(async () => {
    if (!user || !sessionId || !selfieUri) {
      Haptic.error();
      setErrorMessage('Please capture your face selfie before proceeding.');
      return;
    }

    Haptic.confirm();
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const uploadRes = await uploadSelfie(sessionId, user.id, selfieUri);
      if (uploadRes.error) {
        Haptic.error();
        setErrorMessage(uploadRes.error);
        setIsProcessing(false);
        return;
      }

      Haptic.success();
      setStep('pan');
    } catch (err) {
      Haptic.error();
      setErrorMessage(err instanceof Error ? err.message : 'Failed to register selfie.');
    } finally {
      setIsProcessing(false);
    }
  }, [user, sessionId, selfieUri]);

  // Step 5: Verify PAN Card
  const handleVerifyPan = useCallback(async () => {
    if (!user || !sessionId) return;
    const cleanPan = panNumber.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!panRegex.test(cleanPan)) {
      Haptic.error();
      setErrorMessage('Please enter a valid 10-character PAN (e.g. ABCDE1234F).');
      return;
    }

    Haptic.confirm();
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const panRes = await verifyPan(sessionId, user.id, cleanPan);
      if (panRes.error) {
        Haptic.error();
        setErrorMessage(panRes.error);
        setIsProcessing(false);
        return;
      }

      setIsPanVerified(true);

      const compRes = await completeSandboxKyc(sessionId, user.id);
      if (compRes.error) {
        Haptic.error();
        setErrorMessage(compRes.error);
        setIsProcessing(false);
        return;
      }

      Haptic.success();
      updateUser({
        kycStatus: 'approved',
        verified: true,
        isAadhaarVerified: true,
        isAddressVerified: true,
      });
      setStep('completed');
    } catch (err) {
      Haptic.error();
      setErrorMessage(err instanceof Error ? err.message : 'Error completing PAN check.');
    } finally {
      setIsProcessing(false);
    }
  }, [user, sessionId, panNumber, updateUser]);

  // Step 5: Skip PAN (Zero penalty, completes KYC immediately)
  const handleSkipPan = useCallback(async () => {
    if (!user || !sessionId) return;
    Haptic.tap();
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      await skipPan(sessionId, user.id);
      const compRes = await completeSandboxKyc(sessionId, user.id);
      if (compRes.error) {
        Haptic.error();
        setErrorMessage(compRes.error);
        setIsProcessing(false);
        return;
      }

      Haptic.success();
      updateUser({
        kycStatus: 'approved',
        verified: true,
        isAadhaarVerified: true,
        isAddressVerified: true,
      });
      setStep('completed');
    } catch (err) {
      Haptic.error();
      setErrorMessage(err instanceof Error ? err.message : 'Error completing KYC.');
    } finally {
      setIsProcessing(false);
    }
  }, [user, sessionId, updateUser]);

  // Stepper Indicator Mapping
  const stepNumber =
    step === 'aadhaar_number'
      ? 0
      : step === 'aadhaar_otp'
        ? 1
        : step === 'aadhaar_verified'
          ? 2
          : step === 'selfie'
            ? 3
            : step === 'pan'
              ? 4
              : 5;

  const stepLabel =
    step === 'aadhaar_number'
      ? 'Aadhaar ID'
      : step === 'aadhaar_otp'
        ? 'UIDAI OTP'
        : step === 'aadhaar_verified'
          ? 'Verified Profile'
          : step === 'selfie'
            ? 'Live Selfie'
            : step === 'pan'
              ? 'PAN (Optional)'
              : 'Verified';

  // ---------------------------------------------------------------------------
  // STEP 1: 12-DIGIT AADHAAR NUMBER INPUT
  // ---------------------------------------------------------------------------
  const renderAadhaarNumberStep = () => {
    const cleanDigits = aadhaarRaw.replace(/\D/g, '');
    const isComplete = cleanDigits.length === 12;

    return (
      <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
        {/* Official Trust Shield */}
        <View style={[styles.trustPill, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
          <MaterialIcons name="verified-user" size={16} color={C.primary} />
          <Text style={[styles.trustPillText, { color: C.primary }]}>
            UIDAI Certified Gateway • 256-Bit SSL Encrypted
          </Text>
        </View>

        <View style={[styles.iconCircle, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="fingerprint" size={44} color={C.primary} />
        </View>

        <Text style={[styles.title, { color: C.textPrimary }]}>Aadhaar Identity Verification</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          Enter your 12-digit Aadhaar number to verify your identity directly against official UIDAI government records.
        </Text>

        {/* Aadhaar Input Box with Security & Formatting */}
        <View style={styles.inputContainer}>
          <View style={styles.labelRow}>
            <Text style={[styles.inputLabel, { color: C.textPrimary }]}>Aadhaar Number</Text>
            <Text style={[styles.digitCounter, { color: isComplete ? C.success : C.textMuted }]}>
              {cleanDigits.length} / 12 digits
            </Text>
          </View>

          <View
            style={[
              styles.aadhaarInputContainer,
              {
                borderColor: isComplete ? C.success : C.surfaceBorder,
                backgroundColor: C.surfaceElevated,
              },
            ]}
          >
            <MaterialIcons
              name="credit-card"
              size={22}
              color={isComplete ? C.success : C.textMuted}
              style={{ marginRight: Spacing.sm }}
            />
            <TextInput
              style={[
                styles.aadhaarTextInput,
                { color: C.textPrimary },
              ]}
              placeholder="0000 0000 0000"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              maxLength={16}
              secureTextEntry={!showAadhaar}
              value={formatAadhaarDisplay(aadhaarRaw)}
              onChangeText={handleAadhaarChange}
            />
            <Pressable
              hitSlop={10}
              onPress={() => setShowAadhaar(!showAadhaar)}
              style={styles.eyeButton}
            >
              <MaterialIcons
                name={showAadhaar ? 'visibility' : 'visibility-off'}
                size={20}
                color={C.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {/* UIDAI Privacy Guarantee Callout */}
        <View style={[styles.guaranteeBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <MaterialIcons name="lock-outline" size={18} color={C.primary} />
          <Text style={[styles.guaranteeText, { color: C.textSecondary }]}>
            <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>UIDAI Privacy Guarantee: </Text>
            Your 12-digit Aadhaar number is never stored on our servers. It is securely routed to dispatch your one-time authentication passcode.
          </Text>
        </View>

        {errorMessage ? (
          <Animated.View entering={FadeIn.duration(200)} style={[styles.errorBox, { backgroundColor: C.errorSubtle }]}>
            <MaterialIcons name="error-outline" size={18} color={C.error} />
            <Text style={[styles.errorText, { color: C.error }]}>{errorMessage}</Text>
          </Animated.View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={handleSendOtp}
          disabled={isProcessing || !isComplete}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: C.primary,
              opacity: isProcessing || !isComplete ? 0.5 : pressed ? 0.88 : 1,
            },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.buttonInner}>
              <MaterialIcons name="send" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.primaryButtonText}>Send UIDAI OTP</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  // ---------------------------------------------------------------------------
  // STEP 2: 6-DIGIT UIDAI OTP VERIFICATION
  // ---------------------------------------------------------------------------
  const renderAadhaarOtpStep = () => {
    const isOtpReady = otpCode.replace(/\D/g, '').length === 6;

    return (
      <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="sms" size={40} color={C.primary} />
        </View>

        <Text style={[styles.title, { color: C.textPrimary }]}>Enter 6-Digit OTP</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          UIDAI has generated a time-sensitive verification code for Aadhaar{' '}
          <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>
            {maskedAadhaar || '•••• ' + aadhaarRaw.slice(-4)}
          </Text>
        </Text>

        {/* Registered Mobile Highlight Badge */}
        <View style={[styles.mobileHighlightBadge, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <View style={[styles.mobileIconWrap, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="phone-android" size={18} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mobileBadgeLabel, { color: C.textMuted }]}>
              OTP DISPATCHED TO
            </Text>
            <Text style={[styles.mobileBadgeNumber, { color: C.textPrimary }]}>
              {registeredMobileEnding ? (
                <>
                  Mobile ending in{' '}
                  <Text style={{ fontWeight: FontWeight.bold, color: C.primary }}>
                    •••• ••{registeredMobileEnding}
                  </Text>
                </>
              ) : (
                <Text style={{ fontWeight: FontWeight.bold, color: C.primary }}>
                  Aadhaar-linked mobile
                </Text>
              )}
            </Text>
          </View>
          <View style={[styles.liveStatusPill, { backgroundColor: C.successSubtle }]}>
            <View style={[styles.liveDot, { backgroundColor: C.success }]} />
            <Text style={[styles.liveStatusText, { color: C.success }]}>Sent</Text>
          </View>
        </View>

        {/* Change Aadhaar Link */}
        <Pressable
          onPress={() => {
            Haptic.tap();
            setOtpCode('');
            setStep('aadhaar_number');
          }}
          style={styles.changeLink}
        >
          <MaterialIcons name="edit" size={14} color={C.primary} />
          <Text style={[styles.changeLinkText, { color: C.primary }]}>Change Aadhaar Number</Text>
        </Pressable>

        {/* 6 Individual Digit Slots Container */}
        <View style={styles.otpBoxesContainer}>
          <View style={styles.otpBoxesRow}>
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const digit = otpCode[index] || '';
              const isCurrent = otpCode.length === index;
              const isFilled = Boolean(digit);
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    {
                      backgroundColor: C.surfaceElevated,
                      borderColor: isCurrent
                        ? C.primary
                        : isFilled
                        ? C.success
                        : C.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={[styles.otpDigitText, { color: C.textPrimary }]}>
                    {digit}
                  </Text>
                  {isCurrent && <View style={[styles.otpCursor, { backgroundColor: C.primary }]} />}
                </View>
              );
            })}
          </View>

          {/* Hidden text input positioned across entire container */}
          <TextInput
            style={styles.hiddenOtpInput}
            keyboardType="number-pad"
            maxLength={6}
            value={otpCode}
            autoFocus
            caretHidden
            onChangeText={(text) => {
              const clean = text.replace(/\D/g, '').slice(0, 6);
              setOtpCode(clean);
              if (clean.length > otpCode.length) {
                Haptic.select();
              }
              if (errorMessage) setErrorMessage(null);
              if (clean.length === 6) {
                Haptic.confirm();
              }
            }}
          />
        </View>

        {/* Resend Timer / Action */}
        <View style={styles.resendRow}>
          {resendCountdown > 0 ? (
            <Text style={[styles.resendTimerText, { color: C.textMuted }]}>
              Resend OTP in <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>{resendCountdown}s</Text>
            </Text>
          ) : (
            <Pressable
              onPress={() => {
                Haptic.tap();
                handleSendOtp();
              }}
              disabled={isProcessing}
              hitSlop={10}
            >
              <Text style={[styles.resendActionText, { color: C.primary }]}>Didn't receive code? Resend OTP</Text>
            </Pressable>
          )}
        </View>

        {errorMessage ? (
          <Animated.View entering={FadeIn.duration(200)} style={[styles.errorBox, { backgroundColor: C.errorSubtle }]}>
            <MaterialIcons name="error-outline" size={18} color={C.error} />
            <Text style={[styles.errorText, { color: C.error }]}>{errorMessage}</Text>
          </Animated.View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={handleVerifyOtp}
          disabled={isProcessing || !isOtpReady}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: C.primary,
              opacity: isProcessing || !isOtpReady ? 0.5 : pressed ? 0.88 : 1,
            },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.buttonInner}>
              <MaterialIcons name="check-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.primaryButtonText}>Verify & Authenticate</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  // ---------------------------------------------------------------------------
  // STEP 3: VERIFIED IDENTITY & ADDRESS CONFIRMATION
  // ---------------------------------------------------------------------------
  const renderAadhaarVerifiedStep = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: C.successSubtle }]}>
        <MaterialIcons name="verified" size={48} color={C.success} />
      </View>

      <Text style={[styles.title, { color: C.textPrimary }]}>Identity Verified</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        Your official identity and residential address have been confirmed by UIDAI government records.
      </Text>

      {/* Verified Government Profile Card */}
      <View style={[styles.verifiedCard, { borderColor: C.success + '44', backgroundColor: C.surfaceElevated }]}>
        <View style={styles.verifiedCardHeader}>
          <Text style={[styles.verifiedCardTitle, { color: C.textPrimary }]}>Government Record</Text>
          <View style={[styles.statusPill, { backgroundColor: C.successSubtle }]}>
            <MaterialIcons name="check-circle" size={14} color={C.success} />
            <Text style={[styles.statusPillText, { color: C.success }]}>UIDAI Authenticated</Text>
          </View>
        </View>

        <Text style={[styles.verifiedName, { color: C.textPrimary }]}>{aadhaarData?.name}</Text>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: C.textSecondary }]}>
            Aadhaar: <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>{aadhaarData?.aadhaarNumberMasked ?? maskedAadhaar}</Text>
          </Text>
          {aadhaarData?.gender ? (
            <Text style={[styles.metaText, { color: C.textSecondary }]}>•  {aadhaarData.gender}</Text>
          ) : null}
          {aadhaarData?.dob ? (
            <Text style={[styles.metaText, { color: C.textSecondary }]}>•  DOB: {aadhaarData.dob}</Text>
          ) : null}
        </View>

        <View style={[styles.addressBox, { borderTopColor: C.surfaceBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <MaterialIcons name="home" size={15} color={C.textMuted} />
            <Text style={[styles.addressLabel, { color: C.textSecondary }]}>Verified Residential Address</Text>
          </View>
          <Text style={[styles.addressText, { color: C.textPrimary }]}>
            {aadhaarData?.address?.fullAddress || 'Address on record with UIDAI'}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleProceedToSelfie}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 },
        ]}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.primaryButtonText}>Continue to Face Liveness Selfie</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
        </View>
      </Pressable>
    </Animated.View>
  );

  // ---------------------------------------------------------------------------
  // STEP 4: MANDATORY FACE LIVENESS / SELFIE
  // ---------------------------------------------------------------------------
  const renderSelfieStep = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons name="camera-alt" size={44} color={C.primary} />
      </View>

      <Text style={[styles.title, { color: C.textPrimary }]}>Face Liveness Selfie</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        To prevent account fraud and protect couriers, please take a clear front-facing selfie.
      </Text>

      {/* Guidelines Checklist */}
      <View style={[styles.guidelinesContainer, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
        <View style={styles.guidelineItem}>
          <MaterialIcons name="wb-sunny" size={16} color={C.primary} />
          <Text style={[styles.guidelineText, { color: C.textSecondary }]}>Ensure good, even lighting</Text>
        </View>
        <View style={styles.guidelineItem}>
          <MaterialIcons name="face" size={16} color={C.primary} />
          <Text style={[styles.guidelineText, { color: C.textSecondary }]}>Remove caps, sunglasses, or masks</Text>
        </View>
        <View style={styles.guidelineItem}>
          <MaterialIcons name="remove-red-eye" size={16} color={C.primary} />
          <Text style={[styles.guidelineText, { color: C.textSecondary }]}>Look directly into the camera</Text>
        </View>
      </View>

      {/* Camera Capture Frame */}
      <View style={styles.selfieFrameContainer}>
        {selfieUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selfieUri }} style={styles.selfiePreview} contentFit="cover" />
            <Pressable
              accessibilityRole="button"
              onPress={handleLaunchCamera}
              style={[styles.retakeFloatingButton, { backgroundColor: C.surfaceElevated }]}
            >
              <MaterialIcons name="refresh" size={16} color={C.textPrimary} />
              <Text style={[styles.retakeText, { color: C.textPrimary }]}>Retake Photo</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={handleLaunchCamera}
            style={[styles.cameraPlaceholder, { borderColor: C.primary, backgroundColor: C.surfaceElevated }]}
          >
            <View style={[styles.cameraInnerIcon, { backgroundColor: C.primarySubtle }]}>
              <MaterialIcons name="add-a-photo" size={32} color={C.primary} />
            </View>
            <Text style={[styles.cameraPromptTitle, { color: C.textPrimary }]}>Tap to open camera</Text>
            <Text style={[styles.cameraPromptSub, { color: C.textSecondary }]}>Align your face within the frame</Text>
          </Pressable>
        )}
      </View>

      {errorMessage ? (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.errorBox, { backgroundColor: C.errorSubtle }]}>
          <MaterialIcons name="error-outline" size={18} color={C.error} />
          <Text style={[styles.errorText, { color: C.error }]}>{errorMessage}</Text>
        </Animated.View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={handleUploadSelfie}
        disabled={isProcessing || !selfieUri}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: C.primary,
            opacity: isProcessing || !selfieUri ? 0.5 : pressed ? 0.88 : 1,
          },
        ]}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <View style={styles.buttonInner}>
            <MaterialIcons name="cloud-upload" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryButtonText}>Confirm & Proceed</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );

  // ---------------------------------------------------------------------------
  // STEP 5: OPTIONAL PAN CARD VERIFICATION
  // ---------------------------------------------------------------------------
  const renderPanStep = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
      <View style={[styles.optionalPill, { backgroundColor: C.accentSubtle, borderColor: C.accent + '33' }]}>
        <MaterialIcons name="stars" size={16} color={C.accent} />
        <Text style={[styles.optionalPillText, { color: C.accent }]}>Optional Step • Can Be Skipped</Text>
      </View>

      <View style={[styles.iconCircle, { backgroundColor: C.accentSubtle }]}>
        <MaterialIcons name="badge" size={44} color={C.accent} />
      </View>

      <Text style={[styles.title, { color: C.textPrimary }]}>PAN Verification</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        Add your PAN card to unlock higher daily delivery earnings and instant bank withdrawals.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: C.textPrimary }]}>Permanent Account Number (PAN)</Text>
        <TextInput
          style={[
            styles.panInput,
            {
              borderColor: C.surfaceBorder,
              backgroundColor: C.surfaceElevated,
              color: C.textPrimary,
            },
          ]}
          placeholder="e.g. ABCDE1234F"
          placeholderTextColor={C.textMuted}
          autoCapitalize="characters"
          maxLength={10}
          value={panNumber}
          onChangeText={(text) => {
            setPanNumber(text.toUpperCase());
            if (errorMessage) setErrorMessage(null);
          }}
        />
      </View>

      {/* Reassurance that skipping has ZERO penalty */}
      <View style={[styles.skipReassurance, { backgroundColor: C.surfaceElevated }]}>
        <MaterialIcons name="check-circle-outline" size={16} color={C.success} />
        <Text style={[styles.skipReassuranceText, { color: C.textSecondary }]}>
          Skipping PAN will not delay or block your KYC approval. You can add it anytime later.
        </Text>
      </View>

      {errorMessage ? (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.errorBox, { backgroundColor: C.errorSubtle }]}>
          <MaterialIcons name="error-outline" size={18} color={C.error} />
          <Text style={[styles.errorText, { color: C.error }]}>{errorMessage}</Text>
        </Animated.View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={handleVerifyPan}
        disabled={isProcessing || panNumber.trim().length !== 10}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: C.primary,
            opacity: isProcessing || panNumber.trim().length !== 10 ? 0.5 : pressed ? 0.88 : 1,
          },
        ]}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Verify PAN & Finish</Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={handleSkipPan}
        disabled={isProcessing}
        style={({ pressed }) => [
          styles.secondaryButton,
          {
            borderColor: C.surfaceBorder,
            opacity: isProcessing ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.secondaryButtonText, { color: C.textSecondary }]}>Skip for now (Complete Verification)</Text>
      </Pressable>
    </Animated.View>
  );

  // ---------------------------------------------------------------------------
  // STEP 6: VERIFIED CELEBRATION & COMPLETION
  // ---------------------------------------------------------------------------
  const renderCompletedStep = () => (
    <Animated.View entering={ZoomIn.duration(450)} style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: C.successSubtle }]}>
        <MaterialIcons name="verified" size={56} color={C.success} />
      </View>

      <Text style={[styles.title, { color: C.textPrimary }]}>You're Officially Verified!</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        Your identity has been authenticated. You now have full access to accept deliveries, create trips, and earn on CarryGo.
      </Text>

      <View style={[styles.summaryContainer, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <MaterialIcons name="check-circle" size={18} color={C.success} />
            <Text style={[styles.summaryLabel, { color: C.textPrimary }]}>Aadhaar Identity</Text>
          </View>
          <Text style={[styles.summaryValue, { color: C.success }]}>UIDAI Verified</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <MaterialIcons name="check-circle" size={18} color={C.success} />
            <Text style={[styles.summaryLabel, { color: C.textPrimary }]}>Residential Address</Text>
          </View>
          <Text style={[styles.summaryValue, { color: C.success }]}>UIDAI Verified</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <MaterialIcons name="check-circle" size={18} color={C.success} />
            <Text style={[styles.summaryLabel, { color: C.textPrimary }]}>Face Liveness Selfie</Text>
          </View>
          <Text style={[styles.summaryValue, { color: C.success }]}>Approved</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <MaterialIcons
              name={isPanVerified ? 'check-circle' : 'remove-circle-outline'}
              size={18}
              color={isPanVerified ? C.success : C.textMuted}
            />
            <Text style={[styles.summaryLabel, { color: C.textPrimary }]}>PAN Card</Text>
          </View>
          <Text style={[styles.summaryValue, { color: isPanVerified ? C.success : C.textMuted }]}>
            {isPanVerified ? 'Verified' : 'Optional (Skipped)'}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 },
        ]}
      >
        <Text style={styles.primaryButtonText}>Return to Profile</Text>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.surfaceBorder }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: C.surfaceElevated }]}
        >
          <MaterialIcons name="arrow-back" size={22} color={C.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Identity Verification</Text>
          <View style={styles.lockBadge}>
            <MaterialIcons name="lock" size={11} color={C.success} />
            <Text style={[styles.lockBadgeText, { color: C.success }]}>UIDAI Encrypted</Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Indicator */}
      {step !== 'completed' ? (
        <KycStepIndicator currentStep={stepNumber} totalSteps={5} stepLabel={stepLabel} />
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'aadhaar_number' && renderAadhaarNumberStep()}
        {step === 'aadhaar_otp' && renderAadhaarOtpStep()}
        {step === 'aadhaar_verified' && renderAadhaarVerifiedStep()}
        {step === 'selfie' && renderSelfieStep()}
        {step === 'pan' && renderPanStep()}
        {step === 'completed' && renderCompletedStep()}
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
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
  headerSpacer: {
    width: 38,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 6,
    marginBottom: Spacing.md,
  },
  trustPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  optionalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 6,
    marginBottom: Spacing.md,
  },
  optionalPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  inputContainer: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  digitCounter: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  aadhaarInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  aadhaarTextInput: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.5,
    height: '100%',
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    width: '100%',
    marginBottom: Spacing.lg,
  },
  guaranteeText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  changeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.lg,
  },
  changeLinkText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textDecorationLine: 'underline',
  },
  otpInputBox: {
    width: '100%',
    height: 56,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: 12,
  },
  mobileHighlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  mobileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileBadgeLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  mobileBadgeNumber: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  liveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveStatusText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  otpBoxesContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 54,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  otpDigitText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  otpCursor: {
    position: 'absolute',
    bottom: 8,
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  hiddenOtpInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.01,
    fontSize: 1,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  resendTimerText: {
    fontSize: FontSize.xs,
  },
  resendActionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textDecorationLine: 'underline',
  },
  verifiedCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  verifiedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  verifiedCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  verifiedName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 6,
  },
  metaText: {
    fontSize: FontSize.xs,
  },
  addressBox: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  addressLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  addressText: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    fontWeight: FontWeight.medium,
  },
  guidelinesContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  guidelineText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  selfieFrameContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cameraPlaceholder: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  cameraInnerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  cameraPromptTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  cameraPromptSub: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: 4,
  },
  previewContainer: {
    alignItems: 'center',
  },
  selfiePreview: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  retakeFloatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
    elevation: 2,
  },
  retakeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  panInput: {
    width: '100%',
    height: 52,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 2,
  },
  skipReassurance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    width: '100%',
    marginBottom: Spacing.lg,
  },
  skipReassuranceText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  summaryContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  summaryValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    width: '100%',
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.xs,
    flex: 1,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  secondaryButton: {
    width: '100%',
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
