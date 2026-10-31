import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useAlert } from '@/template';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { AadhaarVerifiedData, UserRole } from '@/types';
import {
  updateProfile,
  completeProfile,
  normalizeIndianMobile,
  normalizeUsername,
  validateUsername,
  isUsernameTaken,
  isProfileComplete,
} from '@/services/profile.service';
import {
  generateAadhaarOtp,
  verifyAadhaarOtp,
  uploadSelfie,
  submitSandboxKyc,
  fetchLatestKycSession,
} from '@/services/kyc.service';
import { verifyHumanFace, FaceVerificationResult } from '@/services/face-verification.service';
import KycStepIndicator from '@/components/feature/kyc/KycStepIndicator';
import { Haptic } from '@/services/haptics.service';
import { KeyboardAwareScrollView } from '@/components';
import { getCityNames } from '@/constants/indian-cities';
import { detectCurrentCity } from '@/services/location.service';

type AccountStep = 'account_username' | 'account_name' | 'account_phone' | 'account_city' | 'account_role';
type KycInnerStep =
  | 'aadhaar_number'
  | 'aadhaar_otp'
  | 'aadhaar_verified'
  | 'selfie'
  | 'completed';
type KycStep = AccountStep | KycInnerStep;

const ACCOUNT_STEPS: AccountStep[] = ['account_username', 'account_name', 'account_phone', 'account_city', 'account_role'];

const ALL_CITIES = getCityNames();

const ROLE_OPTIONS: { id: UserRole; icon: keyof typeof MaterialIcons.glyphMap; title: string; sub: string }[] = [
  {
    id: 'sender',
    icon: 'inventory-2',
    title: 'I want to send parcels',
    sub: 'Find travellers to carry my packages.',
  },
  {
    id: 'traveller',
    icon: 'directions-car',
    title: 'I travel and earn',
    sub: 'Carry parcels on my route and earn.',
  },
  {
    id: 'both',
    icon: 'swap-horiz',
    title: 'Both send and earn',
    sub: 'Use the full CaryGoo experience.',
  },
];

function formatMobileInput(value?: string) {
  const digits = (value || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').slice(-10);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export default function KycScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser, refreshUser, logout, isLoading: isAuthLoading } = useAuth();
  const { C, S } = useThemeColors();
  const { showAlert } = useAlert();

  // Determine where the user should start. If the profile is incomplete, show
  // Account Details first; otherwise go directly to Aadhaar.
  const profileAlreadyComplete = isProfileComplete(user);
  const [step, setStep] = useState<KycStep>(() => (
    isProfileComplete(user) ? 'aadhaar_number' : 'account_username'
  ));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  // --- Account Details (profile-setup) state ---
  const [accountUsername, setAccountUsername] = useState('');
  const [accountFullName, setAccountFullName] = useState('');
  const [accountPhone, setAccountPhone] = useState('');
  const [accountCity, setAccountCity] = useState('');
  const [accountCitySearch, setAccountCitySearch] = useState('');
  const [accountRole, setAccountRole] = useState<UserRole | null>(null);
  const [isAccountSaving, setIsAccountSaving] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [detectingCity, setDetectingCity] = useState(false);
  const [detectedLiveCity, setDetectedLiveCity] = useState<string | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  // Prefill account fields from the user profile and keep the starting step
  // in sync whenever auth finishes loading.
  useEffect(() => {
    if (!user) return;
    setAccountUsername(user.username || '');
    setAccountFullName(user.fullName || '');
    setAccountPhone(formatMobileInput(user.phone));
    setAccountCity(user.city || '');
    setAccountRole((user.role as UserRole) || null);
  }, [user]);

  // If auth stops loading and we somehow have no user, bounce to login.
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      const t = setTimeout(() => {
        if (!user) router.replace('/login');
      }, 500);
      return () => clearTimeout(t);
    }
  }, [isAuthLoading, user, router]);

  // Aadhaar Form State
  const [aadhaarRaw, setAadhaarRaw] = useState('');
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [maskedAadhaar, setMaskedAadhaar] = useState('');

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [registeredMobileEnding, setRegisteredMobileEnding] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // Verified Data State
  const [aadhaarData, setAadhaarData] = useState<AadhaarVerifiedData | null>(null);

  // Selfie States
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [faceVerification, setFaceVerification] = useState<FaceVerificationResult | null>(null);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);

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

  // Check if user is already verified or has submission under review on mount.
  // Only do this once the profile is complete — otherwise we're still in the
  // Account Details phase and should not jump to the completed KYC screen.
  useEffect(() => {
    if (!user) return;
    if (!isProfileComplete(user)) return;
    if (user.kycStatus === 'approved') {
      setStep('completed');
      return;
    }

    if (user.kycStatus === 'submitted') {
      setStep('completed');
      return;
    }

    // If profile KYC status is pending, user has not completed submission — start fresh
    fetchLatestKycSession(user.id).then(({ data: session }) => {
      if (!session) return;
      setSessionId(session.id);

      if (session.status === 'approved' || session.status === 'submitted') {
        // Only mark completed if the user profile also confirms submission/approval
        if (user.kycStatus === 'approved' || user.kycStatus === 'submitted') {
          setStep('completed');
        }
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
          setStep('completed');
        } else {
          setStep('selfie');
        }
      }
    });
  }, [user]);

  // ---------------------------------------------------------------------------
  // ACCOUNT DETAILS HANDLERS
  // ---------------------------------------------------------------------------
  const isAccountStep = ACCOUNT_STEPS.includes(step as AccountStep);

  const accountUsernameValue = normalizeUsername(accountUsername);
  const accountUsernameReady =
    accountUsernameValue.length > 0 && !validateUsername(accountUsernameValue);
  const accountNameReady = accountFullName.trim().split(/\s+/).filter(Boolean).length >= 2;
  const accountPhoneReady = Boolean(normalizeIndianMobile(accountPhone));
  const activeAccountCity = (accountCity || accountCitySearch).trim();

  const trimmedCitySearch = accountCitySearch.trim();
  const filteredCities = useMemo(() => (
    trimmedCitySearch.length >= 2
      ? ALL_CITIES.filter((c) => c.toLowerCase().includes(trimmedCitySearch.toLowerCase())).slice(0, 5)
      : []
  ), [trimmedCitySearch]);
  const hasExactCityMatch = useMemo(
    () => ALL_CITIES.some((c) => c.toLowerCase() === trimmedCitySearch.toLowerCase()),
    [trimmedCitySearch],
  );
  const showCustomCityOption =
    trimmedCitySearch.length >= 2 &&
    !hasExactCityMatch &&
    trimmedCitySearch.toLowerCase() !== accountCity.toLowerCase();

  const handleAccountUsernameNext = useCallback(async () => {
    const normalized = normalizeUsername(accountUsername);
    const err = validateUsername(normalized);
    if (err) {
      Haptic.error();
      setAccountError(err);
      return;
    }
    setIsCheckingUsername(true);
    const check = await isUsernameTaken(normalized, user?.id);
    setIsCheckingUsername(false);
    if (check.error) {
      Haptic.error();
      setAccountError('Could not check username availability. Please try again.');
      return;
    }
    if (check.taken) {
      Haptic.error();
      setAccountError('This username is already taken. Please choose another.');
      return;
    }
    setAccountUsername(normalized);
    setAccountError(null);
    Haptic.confirm();
    setStep('account_name');
  }, [accountUsername, user?.id]);

  const handleAccountNameNext = useCallback(() => {
    const normalizedName = accountFullName.trim().replace(/\s+/g, ' ');
    if (normalizedName.length < 2) {
      Haptic.error();
      setAccountError('Please enter your full name.');
      return;
    }
    if (normalizedName.split(' ').length < 2) {
      Haptic.error();
      setAccountError('Please enter both your first and last name.');
      return;
    }
    setAccountFullName(normalizedName);
    setAccountError(null);
    Haptic.confirm();
    setStep('account_phone');
  }, [accountFullName]);

  const handleAccountPhoneNext = useCallback(() => {
    if (!normalizeIndianMobile(accountPhone)) {
      Haptic.error();
      setAccountError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setAccountError(null);
    Haptic.confirm();
    setStep('account_city');
  }, [accountPhone]);

  const fetchLiveCity = useCallback(async (silent = false) => {
    setDetectingCity(true);
    setDetectionError(null);
    if (!silent) Haptic.tap();
    try {
      const { data, error } = await detectCurrentCity();
      if (data) {
        setAccountCity(data);
        setAccountCitySearch(data);
        setDetectedLiveCity(data);
        Haptic.success();
      } else {
        const errorMsg = error || 'Could not detect live location.';
        setDetectionError(errorMsg);
        if (!silent) {
          Haptic.error();
          if (errorMsg.includes('settings') || errorMsg.includes('denied')) {
            showAlert(
              'Location Access Required',
              'CaryGoo uses your location to automatically detect your city. Please grant location access in device settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => { void Linking.openSettings(); } },
              ],
            );
          } else {
            showAlert('Location Detection', errorMsg);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Location detection failed.';
      setDetectionError(msg);
      if (!silent) {
        Haptic.error();
        showAlert('Location Detection', msg);
      }
    } finally {
      setDetectingCity(false);
    }
  }, [showAlert]);

  // Auto-detect once the user lands on the city step with nothing set yet.
  useEffect(() => {
    if (step === 'account_city' && !accountCity && !detectedLiveCity) {
      void fetchLiveCity(true);
    }
  }, [step, accountCity, detectedLiveCity, fetchLiveCity]);

  const handleAccountCityNext = useCallback(() => {
    const finalCity = (accountCity || accountCitySearch).trim();
    if (!finalCity) {
      Haptic.error();
      setAccountError('Please enter or detect your current city.');
      return;
    }
    setAccountCity(finalCity);
    setAccountError(null);
    Haptic.confirm();
    setStep('account_role');
  }, [accountCity, accountCitySearch]);

  const handleAccountFinish = useCallback(async () => {
    if (!user?.id) return;
    if (!accountRole) {
      Haptic.error();
      setAccountError('Please choose how you plan to use CaryGoo.');
      return;
    }
    setIsAccountSaving(true);
    Haptic.confirm();
    const { data, error } = await completeProfile(user.id, {
      username: accountUsernameValue,
      fullName: accountFullName,
      phone: accountPhone,
      city: (accountCity || accountCitySearch).trim(),
      role: accountRole,
    });
    setIsAccountSaving(false);
    if (error) {
      Haptic.error();
      setAccountError(error);
      return;
    }
    if (data) updateUser(data);
    await refreshUser();
    Haptic.success();
    setAccountError(null);
    setStep('aadhaar_number');
  }, [user?.id, accountRole, accountUsernameValue, accountFullName, accountPhone, accountCity, accountCitySearch, updateUser, refreshUser]);

  const handleAccountBack = useCallback(() => {
    const idx = ACCOUNT_STEPS.indexOf(step as AccountStep);
    if (idx <= 0) {
      // First account step: log out (mirrors previous profile-setup behaviour).
      Haptic.tap();
      void logout().then(() => router.replace('/login'));
      return;
    }
    Haptic.tap();
    setAccountError(null);
    setStep(ACCOUNT_STEPS[idx - 1]);
  }, [step, logout, router]);

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
    setInfoMessage(null);

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
      setResendCountdown(60);
      setInfoMessage(null);
      setStep('aadhaar_otp');
    } catch (err) {
      Haptic.error();
      setErrorMessage(err instanceof Error ? err.message : 'Error sending UIDAI OTP.');
    } finally {
      setIsProcessing(false);
    }
  }, [user, aadhaarRaw]);

  // Dedicated Resend OTP Handler respecting UIDAI 60s flood limits and existing active OTPs
  const handleResendOtp = useCallback(async () => {
    if (!user || isResending || isProcessing) return;
    const cleanAadhaar = aadhaarRaw.replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      Haptic.error();
      setErrorMessage('Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    Haptic.tap();
    setIsResending(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const result = await generateAadhaarOtp(
        user.id,
        user.name || user.fullName || 'Citizen User',
        cleanAadhaar,
      );

      if (result.error || !result.data) {
        Haptic.warning();
        const err = result.error ?? 'Could not dispatch a new OTP.';
        if (
          err.toLowerCase().includes('already') ||
          err.toLowerCase().includes('valid') ||
          err.toLowerCase().includes('wait') ||
          err.toLowerCase().includes('flood') ||
          err.toLowerCase().includes('limit')
        ) {
          setInfoMessage('UIDAI: Your existing OTP remains active and valid for 10 minutes. Please enter the code sent to your mobile.');
        } else {
          setErrorMessage(err);
        }
        setResendCountdown(60);
        return;
      }

      Haptic.success();
      setSessionId(result.data.sessionId);
      setReferenceId(result.data.referenceId);
      setMaskedAadhaar(result.data.maskedAadhaar);
      if (result.data.registeredMobileEnding) {
        setRegisteredMobileEnding(result.data.registeredMobileEnding);
      }
      setOtpCode('');
      setResendCountdown(60);
      setInfoMessage('A new OTP has been dispatched to your Aadhaar-linked mobile.');
    } catch (err) {
      Haptic.error();
      setErrorMessage(err instanceof Error ? err.message : 'Error requesting new OTP.');
    } finally {
      setIsResending(false);
    }
  }, [user, isResending, isProcessing, aadhaarRaw]);

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
        aadhaarRaw,
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

  // Step 4: Launch front camera for live selfie with face verification
  const handleLaunchCamera = useCallback(async () => {
    Haptic.tap();
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Haptic.warning();
        showAlert('Camera Required', 'Camera permission is needed to take your live verification selfie.');
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
        const uri = result.assets[0].uri;
        setIsVerifyingFace(true);
        setErrorMessage(null);

        const faceRes = await verifyHumanFace(uri);
        setIsVerifyingFace(false);

        if (!faceRes.isValid) {
          Haptic.error();
          setSelfieUri(null);
          setFaceVerification(faceRes);
          setErrorMessage(faceRes.errorMessage || 'No human face detected. Please ensure your face is well-lit and look directly at the camera.');
          return;
        }

        Haptic.success();
        setSelfieUri(uri);
        setFaceVerification(faceRes);
        setErrorMessage(null);
      }
    } catch {
      setIsVerifyingFace(false);
      Haptic.error();
      setErrorMessage('Could not launch camera or process selfie. Please try again.');
    }
  }, []);

  // Step 4: Upload selfie & submit KYC for review
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

      const compRes = await submitSandboxKyc(sessionId, user.id, faceVerification || undefined);
      if (compRes.error) {
        Haptic.error();
        setErrorMessage(compRes.error);
        setIsProcessing(false);
        return;
      }

      const selfieCdnUrl = uploadRes.data?.cdnUrl || selfieUri;
      // Authoritatively persist selfie as official profile photo in user_profiles
      void updateProfile(user.id, { avatar_url: selfieCdnUrl }, user.id).catch(() => {});

      Haptic.success();
      updateUser({
        kycStatus: 'submitted',
        verified: false,
        isAadhaarVerified: true,
        isAddressVerified: true,
        selfieUrl: selfieCdnUrl,
        avatar: selfieCdnUrl,
        isSelfieVerified: true,
      });
      setStep('completed');
    } catch (err) {
      Haptic.error();
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit verification.');
    } finally {
      setIsProcessing(false);
    }
  }, [user, sessionId, selfieUri, faceVerification, updateUser]);

  // Stepper Indicator Mapping. When the profile still needs completion the
  // wizard runs for 9 steps (5 account + 4 KYC); otherwise just the 4 KYC steps.
  const includeAccountPhase = !profileAlreadyComplete;
  const accountStepsCount = includeAccountPhase ? ACCOUNT_STEPS.length : 0;
  const totalSteps = accountStepsCount + 4;

  const kycStepIndex =
    step === 'aadhaar_number'
      ? 0
      : step === 'aadhaar_otp'
        ? 1
        : step === 'aadhaar_verified'
          ? 2
          : step === 'selfie'
            ? 3
            : 4;

  const accountIdx = ACCOUNT_STEPS.indexOf(step as AccountStep);
  const stepNumber = isAccountStep
    ? accountIdx
    : accountStepsCount + kycStepIndex;

  const stepLabel = isAccountStep
    ? step === 'account_username'
      ? 'Username'
      : step === 'account_name'
        ? 'Your Name'
        : step === 'account_phone'
          ? 'Mobile Number'
          : step === 'account_city'
            ? 'Your City'
            : 'How You Use It'
    : step === 'aadhaar_number'
      ? 'Aadhaar ID'
      : step === 'aadhaar_otp'
        ? 'UIDAI OTP'
        : step === 'aadhaar_verified'
          ? 'Verified Profile'
          : step === 'selfie'
            ? 'Live Selfie'
            : user?.kycStatus === 'approved'
              ? 'Verified'
              : 'In Review';

  // ---------------------------------------------------------------------------
  // ACCOUNT DETAILS RENDERERS (shown only when profile is incomplete)
  // ---------------------------------------------------------------------------
  const renderAccountError = () => (
    accountError ? (
      <Animated.View entering={FadeIn.duration(200)} style={[styles.errorBox, { backgroundColor: C.errorSubtle }]}>
        <MaterialIcons name="error-outline" size={18} color={C.error} />
        <Text style={[styles.errorText, { color: C.error }]}>{accountError}</Text>
      </Animated.View>
    ) : null
  );

  const renderAccountUsernameStep = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons name="alternate-email" size={44} color={C.primary} />
      </View>
      <Text style={[styles.title, { color: C.textPrimary }]}>Choose your username</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        This is your public CaryGoo handle. Travellers and senders will see this.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: C.textPrimary }]}>Username</Text>
        <View style={[styles.aadhaarInputContainer, { borderColor: accountUsernameReady ? C.success : C.surfaceBorder, backgroundColor: C.surfaceElevated, marginTop: Spacing.xs }]}>
          <Text style={[{ color: C.textMuted, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginRight: 4 }]}>@</Text>
          <TextInput
            style={[styles.aadhaarTextInput, { color: C.textPrimary, letterSpacing: 0 }]}
            placeholder="rahul_sharma"
            placeholderTextColor={C.textMuted}
            value={accountUsername}
            onChangeText={(text) => {
              setAccountUsername(normalizeUsername(text).replace(/[^a-z0-9_]/g, ''));
              if (accountError) setAccountError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            maxLength={24}
            returnKeyType="next"
            onSubmitEditing={handleAccountUsernameNext}
            autoFocus
          />
          {accountUsernameReady ? <MaterialIcons name="check-circle" size={18} color={C.success} /> : null}
        </View>
        <Text style={[{ color: C.textMuted, fontSize: FontSize.xs, marginTop: Spacing.xs }]}>3–24 lowercase letters, numbers, or underscores</Text>
      </View>

      {renderAccountError()}

      <Pressable
        accessibilityRole="button"
        onPress={handleAccountUsernameNext}
        disabled={!accountUsernameReady || isCheckingUsername}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: C.primary, opacity: !accountUsernameReady || isCheckingUsername ? 0.5 : pressed ? 0.88 : 1 },
        ]}
      >
        {isCheckingUsername ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <View style={styles.buttonInner}>
            <Text style={styles.primaryButtonText}>Continue</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );

  const renderAccountNameStep = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons name="person" size={44} color={C.primary} />
      </View>
      <Text style={[styles.title, { color: C.textPrimary }]}>What&apos;s your name?</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        Use your real name — it builds trust with people who send or carry parcels.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: C.textPrimary }]}>Full Name</Text>
        <View style={[styles.aadhaarInputContainer, { borderColor: accountNameReady ? C.success : C.surfaceBorder, backgroundColor: C.surfaceElevated, marginTop: Spacing.xs }]}>
          <MaterialIcons name="badge" size={20} color={accountNameReady ? C.success : C.textMuted} style={{ marginRight: Spacing.sm }} />
          <TextInput
            style={[styles.aadhaarTextInput, { color: C.textPrimary, letterSpacing: 0, fontWeight: FontWeight.medium }]}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor={C.textMuted}
            value={accountFullName}
            onChangeText={(text) => {
              setAccountFullName(text);
              if (accountError) setAccountError(null);
            }}
            autoCapitalize="words"
            autoComplete="name"
            maxLength={60}
            returnKeyType="next"
            onSubmitEditing={handleAccountNameNext}
            autoFocus
          />
        </View>
        <Text style={[{ color: C.textMuted, fontSize: FontSize.xs, marginTop: Spacing.xs }]}>Enter your first and last name</Text>
      </View>

      {renderAccountError()}

      <Pressable
        accessibilityRole="button"
        onPress={handleAccountNameNext}
        disabled={!accountNameReady}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: C.primary, opacity: !accountNameReady ? 0.5 : pressed ? 0.88 : 1 },
        ]}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
        </View>
      </Pressable>
    </Animated.View>
  );

  const renderAccountPhoneStep = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons name="phone-android" size={44} color={C.primary} />
      </View>
      <Text style={[styles.title, { color: C.textPrimary }]}>Your mobile number</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        Used for delivery coordination and account recovery after a confirmed match.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: C.textPrimary }]}>Mobile Number</Text>
        <View style={[styles.aadhaarInputContainer, { borderColor: accountPhoneReady ? C.success : C.surfaceBorder, backgroundColor: C.surfaceElevated, marginTop: Spacing.xs }]}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.surfaceBorder, backgroundColor: C.surface, marginRight: Spacing.sm }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textPrimary }}>+91</Text>
          </View>
          <TextInput
            style={[styles.aadhaarTextInput, { color: C.textPrimary, letterSpacing: 1 }]}
            placeholder="98765 43210"
            placeholderTextColor={C.textMuted}
            value={accountPhone}
            onChangeText={(text) => {
              setAccountPhone(formatMobileInput(text));
              if (accountError) setAccountError(null);
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={11}
            returnKeyType="next"
            onSubmitEditing={handleAccountPhoneNext}
            autoFocus
          />
          {accountPhoneReady ? <MaterialIcons name="check-circle" size={18} color={C.success} /> : null}
        </View>
        <Text style={[{ color: C.textMuted, fontSize: FontSize.xs, marginTop: Spacing.xs }]}>10-digit Indian mobile number</Text>
      </View>

      <View style={[styles.guaranteeBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
        <MaterialIcons name="lock-outline" size={18} color={C.primary} />
        <Text style={[styles.guaranteeText, { color: C.textSecondary }]}>
          Your number is only shared with a matched delivery partner after both sides confirm the request.
        </Text>
      </View>

      {renderAccountError()}

      <Pressable
        accessibilityRole="button"
        onPress={handleAccountPhoneNext}
        disabled={!accountPhoneReady}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: C.primary, opacity: !accountPhoneReady ? 0.5 : pressed ? 0.88 : 1 },
        ]}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
        </View>
      </Pressable>
    </Animated.View>
  );

  const renderAccountCityStep = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons name="my-location" size={44} color={C.primary} />
      </View>
      <Text style={[styles.title, { color: C.textPrimary }]}>Where are you based?</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        We use your city to show relevant trips, parcels, and nearby matches.
      </Text>

      {/* Live Location Card */}
      {detectingCity ? (
        <View style={[styles.guaranteeBox, { backgroundColor: C.primarySubtle, borderColor: C.primary + '33' }]}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={[styles.guaranteeText, { color: C.textPrimary }]}>
            Detecting your live city via GPS...
          </Text>
        </View>
      ) : (accountCity || detectedLiveCity) ? (
        <View style={[styles.verifiedCard, { borderColor: C.success + '44', backgroundColor: C.surfaceElevated }]}>
          <View style={styles.verifiedCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={[styles.liveDot, { backgroundColor: C.success }]} />
              <Text style={[styles.verifiedCardTitle, { color: C.success, letterSpacing: 0.5 }]}>LIVE LOCATION</Text>
            </View>
            <Pressable
              onPress={() => void fetchLiveCity(false)}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <MaterialIcons name="refresh" size={14} color={C.primary} />
              <Text style={[styles.changeLinkText, { color: C.primary }]}>Refresh</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 }}>
            <MaterialIcons name="location-on" size={22} color={C.primary} />
            <Text style={[styles.verifiedName, { color: C.textPrimary }]}>{accountCity || detectedLiveCity}</Text>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => void fetchLiveCity(false)}
          style={({ pressed }) => [
            styles.guaranteeBox,
            { backgroundColor: C.primarySubtle, borderColor: C.primary + '55', opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MaterialIcons name="gps-fixed" size={20} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.guaranteeText, { color: C.primary, fontWeight: FontWeight.bold }]}>
              Detect my city automatically
            </Text>
            <Text style={[styles.guaranteeText, { color: C.textMuted }]}>
              {detectionError ? detectionError : 'Tap to use your device location'}
            </Text>
          </View>
          <MaterialIcons name="arrow-forward" size={18} color={C.primary} />
        </Pressable>
      )}

      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: C.textPrimary }]}>Or Type Any City</Text>
        <View style={[styles.aadhaarInputContainer, { borderColor: activeAccountCity ? C.success : C.surfaceBorder, backgroundColor: C.surfaceElevated, marginTop: Spacing.xs }]}>
          <MaterialIcons name="search" size={18} color={activeAccountCity ? C.success : C.textMuted} style={{ marginRight: Spacing.sm }} />
          <TextInput
            style={[styles.aadhaarTextInput, { color: C.textPrimary, letterSpacing: 0, fontWeight: FontWeight.medium }]}
            placeholder="Enter your town or city..."
            placeholderTextColor={C.textMuted}
            value={accountCitySearch}
            onChangeText={(text) => {
              setAccountCitySearch(text);
              setAccountCity(text.trim());
              if (accountError) setAccountError(null);
            }}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleAccountCityNext}
          />
          {activeAccountCity ? <MaterialIcons name="check-circle" size={18} color={C.success} /> : null}
        </View>
      </View>

      {showCustomCityOption ? (
        <Pressable
          onPress={() => {
            Haptic.select();
            setAccountCity(trimmedCitySearch);
          }}
          style={({ pressed }) => [
            styles.guaranteeBox,
            { backgroundColor: C.primarySubtle, borderColor: C.primary + '55', opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MaterialIcons name="add-location-alt" size={18} color={C.primary} />
          <Text style={[styles.guaranteeText, { color: C.primary, fontWeight: FontWeight.semibold }]}>
            {`Set city to "${trimmedCitySearch}"`}
          </Text>
        </Pressable>
      ) : null}

      {filteredCities.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%', marginBottom: Spacing.md }}>
          {filteredCities.map((cityName) => {
            const selected = accountCity.toLowerCase() === cityName.toLowerCase();
            return (
              <Pressable
                key={cityName}
                onPress={() => {
                  Haptic.select();
                  setAccountCity(cityName);
                  setAccountCitySearch(cityName);
                }}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 8,
                    borderRadius: BorderRadius.full,
                    borderWidth: 1,
                    backgroundColor: selected ? C.primary : C.surfaceElevated,
                    borderColor: selected ? C.primary : C.surfaceBorder,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: selected ? '#fff' : C.textPrimary }}>
                  {cityName}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {renderAccountError()}

      <Pressable
        accessibilityRole="button"
        onPress={handleAccountCityNext}
        disabled={!activeAccountCity}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: C.primary, opacity: !activeAccountCity ? 0.5 : pressed ? 0.88 : 1 },
        ]}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.primaryButtonText}>
            {activeAccountCity ? `Continue with ${activeAccountCity}` : 'Continue'}
          </Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
        </View>
      </Pressable>
    </Animated.View>
  );

  const renderAccountRoleStep = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: C.primarySubtle }]}>
        <MaterialIcons name="swap-horiz" size={44} color={C.primary} />
      </View>
      <Text style={[styles.title, { color: C.textPrimary }]}>How will you use CaryGoo?</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        This personalises your home screen. You can change it later from your profile.
      </Text>

      <View style={{ width: '100%', gap: Spacing.sm, marginBottom: Spacing.md }}>
        {ROLE_OPTIONS.map((item) => {
          const selected = accountRole === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                Haptic.select();
                setAccountRole(item.id);
                if (accountError) setAccountError(null);
              }}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.sm,
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? C.primary : C.surfaceBorder,
                  backgroundColor: selected ? C.primarySubtle : C.surfaceElevated,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? C.primary : C.surface,
              }}>
                <MaterialIcons name={item.icon} size={22} color={selected ? '#fff' : C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary }}>{item.title}</Text>
                <Text style={{ fontSize: FontSize.xs, color: C.textMuted, marginTop: 2, lineHeight: 17 }}>{item.sub}</Text>
              </View>
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: selected ? C.primary : C.surfaceBorder,
                backgroundColor: selected ? C.primary : 'transparent',
              }} />
            </Pressable>
          );
        })}
      </View>

      {accountUsernameValue && accountFullName && (accountCity || accountCitySearch) ? (
        <View style={[styles.guaranteeBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <MaterialIcons name="person-pin" size={20} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textPrimary }}>
              @{accountUsernameValue} · {accountFullName}
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 }}>
              Based in {(accountCity || accountCitySearch).trim()} · +91 {accountPhone}
            </Text>
          </View>
        </View>
      ) : null}

      {renderAccountError()}

      <Pressable
        accessibilityRole="button"
        onPress={handleAccountFinish}
        disabled={!accountRole || isAccountSaving}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: C.primary, opacity: !accountRole || isAccountSaving ? 0.5 : pressed ? 0.88 : 1 },
        ]}
      >
        {isAccountSaving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <View style={styles.buttonInner}>
            <Text style={styles.primaryButtonText}>Save & Continue to KYC</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );

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

        {/* UIDAI Validity & Delivery Note */}
        <View style={[styles.guaranteeBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder, marginTop: Spacing.sm }]}>
          <MaterialIcons name="schedule" size={16} color={C.primary} />
          <Text style={[styles.guaranteeText, { color: C.textSecondary }]}>
            <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>UIDAI Notice: </Text>
            Your Aadhaar verification OTP is valid for <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>10 minutes</Text>. If you have already received the SMS, you can enter it directly.
          </Text>
        </View>

        {/* Change Aadhaar Link */}
        <Pressable
          onPress={() => {
            Haptic.tap();
            setOtpCode('');
            setErrorMessage(null);
            setInfoMessage(null);
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
          {isResending ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={C.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.resendActionText, { color: C.primary }]}>Requesting new OTP from UIDAI...</Text>
            </View>
          ) : resendCountdown > 0 ? (
            <Text style={[styles.resendTimerText, { color: C.textMuted }]}>
              Resend OTP in <Text style={{ fontWeight: FontWeight.bold, color: C.textPrimary }}>{resendCountdown}s</Text>
            </Text>
          ) : (
            <Pressable
              onPress={handleResendOtp}
              disabled={isProcessing || isResending}
              hitSlop={10}
            >
              <Text style={[styles.resendActionText, { color: C.primary }]}>Did not receive code? Resend OTP</Text>
            </Pressable>
          )}
        </View>

        {infoMessage ? (
          <Animated.View entering={FadeIn.duration(200)} style={[styles.infoBox, { backgroundColor: C.primarySubtle }]}>
            <MaterialIcons name="info-outline" size={18} color={C.primary} />
            <Text style={[styles.infoText, { color: C.primary }]}>{infoMessage}</Text>
          </Animated.View>
        ) : null}

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
            {faceVerification?.isValid && (
              <View style={[styles.faceVerifiedBadge, { backgroundColor: C.successSubtle, borderColor: C.success + '40' }]}>
                <MaterialIcons name="check-circle" size={14} color={C.success} />
                <Text style={[styles.faceVerifiedText, { color: C.success }]}>
                  Human Face Verified ✓ ({faceVerification.confidence}% match)
                </Text>
              </View>
            )}
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
            disabled={isVerifyingFace}
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

      {isVerifyingFace && (
        <View style={[styles.verifyingFaceBox, { backgroundColor: C.primarySubtle }]}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={[styles.verifyingFaceText, { color: C.primary }]}>
            Analyzing face biometrics &amp; liveness...
          </Text>
        </View>
      )}

      {errorMessage ? (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.errorBox, { backgroundColor: C.errorSubtle }]}>
          <MaterialIcons name="error-outline" size={18} color={C.error} />
          <Text style={[styles.errorText, { color: C.error }]}>{errorMessage}</Text>
        </Animated.View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={handleUploadSelfie}
        disabled={isProcessing || isVerifyingFace || !selfieUri || !faceVerification?.isValid}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: C.primary,
            opacity: isProcessing || isVerifyingFace || !selfieUri || !faceVerification?.isValid ? 0.5 : pressed ? 0.88 : 1,
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
  // STEP 5: VERIFIED CELEBRATION OR SUBMITTED IN-REVIEW STATE
  // ---------------------------------------------------------------------------
  const renderCompletedStep = () => {
    const isApproved = user?.kycStatus === 'approved';

    return (
      <Animated.View entering={ZoomIn.duration(450)} style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: isApproved ? C.successSubtle : C.accentSubtle }]}>
          <MaterialIcons
            name={isApproved ? 'verified' : 'pending-actions'}
            size={56}
            color={isApproved ? C.success : C.accent}
          />
        </View>

        <Text style={[styles.title, { color: C.textPrimary }]}>
          {isApproved ? "You're Officially Verified!" : 'KYC Submitted for Review'}
        </Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          {isApproved
            ? 'Your identity has been authenticated. You now have full access to accept deliveries, create trips, and earn on CaryGoo.'
            : 'Your Aadhaar identity and live selfie with face verification have been submitted. Our compliance team will review and approve your profile shortly.'}
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
              <Text style={[styles.summaryLabel, { color: C.textPrimary }]}>Human Face Verification</Text>
            </View>
            <Text style={[styles.summaryValue, { color: C.success }]}>Verified ✓</Text>
          </View>

          <View style={[styles.summaryRow, { paddingTop: 6, borderTopWidth: 1, borderTopColor: C.surfaceBorder }]}>
            <View style={styles.summaryLeft}>
              <MaterialIcons
                name={isApproved ? 'verified-user' : 'hourglass-top'}
                size={18}
                color={isApproved ? C.success : C.accent}
              />
              <Text style={[styles.summaryLabel, { color: C.textPrimary, fontWeight: FontWeight.bold }]}>
                Compliance Status
              </Text>
            </View>
            <Text
              style={[
                styles.summaryValue,
                {
                  color: isApproved ? C.success : C.accent,
                  fontWeight: FontWeight.bold,
                },
              ]}
            >
              {isApproved ? 'Approved' : 'Pending CMS Approval'}
            </Text>
          </View>
        </View>

        {!isApproved && (
          <View style={[styles.guaranteeBox, { backgroundColor: C.accentSubtle, borderColor: C.accent + '33', marginBottom: Spacing.md }]}>
            <MaterialIcons name="info-outline" size={18} color={C.accent} />
            <Text style={[styles.guaranteeText, { color: C.textPrimary }]}>
              Review typically completes in 1–2 hours during business hours. You can browse routes in the meantime.
            </Text>
          </View>
        )}

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

        {!isApproved && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setAadhaarRaw('');
              setMaskedAadhaar('');
              setOtpCode('');
              setAadhaarData(null);
              setSelfieUri(null);
              setFaceVerification(null);
              setSessionId(null);
              setReferenceId(null);
              setStep('aadhaar_number');
            }}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: C.surfaceBorder, marginTop: Spacing.sm, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: C.textSecondary }]}>Start New Verification</Text>
          </Pressable>
        )}
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: C.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.surfaceBorder }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={isAccountStep ? handleAccountBack : () => router.back()}
          style={[styles.backButton, { backgroundColor: C.surfaceElevated }]}
        >
          <MaterialIcons name="arrow-back" size={22} color={C.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
            {isAccountStep ? 'Account Details' : 'Identity Verification'}
          </Text>
          <View style={styles.lockBadge}>
            <MaterialIcons name="lock" size={11} color={C.success} />
            <Text style={[styles.lockBadgeText, { color: C.success }]}>
              {isAccountStep ? 'Secure Setup' : 'UIDAI Encrypted'}
            </Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Indicator */}
      {step !== 'completed' ? (
        <KycStepIndicator currentStep={stepNumber} totalSteps={totalSteps} stepLabel={stepLabel} />
      ) : null}

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl + 20 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        extraScrollHeight={80}
      >
        {step === 'account_username' && renderAccountUsernameStep()}
        {step === 'account_name' && renderAccountNameStep()}
        {step === 'account_phone' && renderAccountPhoneStep()}
        {step === 'account_city' && renderAccountCityStep()}
        {step === 'account_role' && renderAccountRoleStep()}
        {step === 'aadhaar_number' && renderAadhaarNumberStep()}
        {step === 'aadhaar_otp' && renderAadhaarOtpStep()}
        {step === 'aadhaar_verified' && renderAadhaarVerifiedStep()}
        {step === 'selfie' && renderSelfieStep()}
        {step === 'completed' && renderCompletedStep()}
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
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
  faceVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  faceVerifiedText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  verifyingFaceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    width: '100%',
    marginBottom: Spacing.md,
  },
  verifyingFaceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    width: '100%',
    marginBottom: Spacing.md,
  },
  infoText: {
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
