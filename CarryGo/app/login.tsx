import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Pressable, TextInput, Animated, Dimensions, Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius, Gradients } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Haptic } from '@/services/haptics.service';
import { StatusBar } from 'expo-status-bar';
import { AUTH_OTP_LENGTH } from '@/constants/security';
import { useBreathing, useFadeIn } from '@/hooks/useAnimations';

type Step = 'email' | 'otp';
const OTP_LENGTH = AUTH_OTP_LENGTH;
const RESEND_COOLDOWN = 60; // seconds
const { width: W } = Dimensions.get('window');

const FEATURES = [
  { icon: 'route' as const, text: 'Route-matched deliveries' },
  { icon: 'account-balance-wallet' as const, text: 'Earn while you travel' },
  { icon: 'verified-user' as const, text: 'Trusted community' },
];

export default function LoginScreen() {
  const { sendOTP, verifyOTP, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const { C, isDark } = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const logoBreathing = useBreathing(0.94, 1, 3200);
  const heroFade = useFadeIn(0, 600);
  const formFade = useFadeIn(200, 500);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [emailFocused, setEmailFocused] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds remaining before resend allowed

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const autoSubmittedOtpRef = useRef<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(1)).current;
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const pulseSuccess = useCallback(() => {
    Animated.sequence([
      Animated.spring(successScale, { toValue: 1.08, useNativeDriver: true, tension: 300 }),
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 300 }),
    ]).start();
  }, [successScale]);

  const animateToOTP = () =>
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }).start();
  const animateBack = () =>
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
  };

  const handleSendOTP = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Haptic.error();
      shake();
      showAlert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    Haptic.confirm();
    const { error } = await sendOTP(email.trim().toLowerCase());
    if (error) {
      Haptic.error();
      shake();
      showAlert('Could Not Send Code', error);
      return;
    }
    startCooldown();
    autoSubmittedOtpRef.current = null;
    setStep('otp');
    animateToOTP();
    Haptic.success();
    // Focus first OTP box after animation
    setTimeout(() => otpRefs.current[0]?.focus(), 400);
  };

  const handleOtpChange = useCallback((val: string, idx: number) => {
    autoSubmittedOtpRef.current = null;
    // Support paste: if user pastes multiple digits, fill them all
    const digits = val.replace(/\D/g, '');
    if (digits.length > 1) {
      // Paste scenario — fill from idx onwards
      const newOtp = [...otp];
      for (let i = 0; i < digits.length && idx + i < OTP_LENGTH; i++) {
        newOtp[idx + i] = digits[i];
      }
      setOtp(newOtp);
      // Focus the next unfilled box or last box
      const nextIdx = Math.min(idx + digits.length, OTP_LENGTH - 1);
      otpRefs.current[nextIdx]?.focus();
      if (newOtp.every(d => d !== '')) {
        Haptic.success();
      }
      return;
    }
    const cleaned = digits.slice(-1);
    const newOtp = [...otp];
    newOtp[idx] = cleaned;
    setOtp(newOtp);
    if (cleaned) {
      Haptic.select();
      if (idx < OTP_LENGTH - 1) otpRefs.current[idx + 1]?.focus();
    }
  }, [otp]);

  const handleOtpKeyPress = useCallback((key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      const newOtp = [...otp];
      newOtp[idx - 1] = '';
      setOtp(newOtp);
      otpRefs.current[idx - 1]?.focus();
    }
  }, [otp]);

  // Auto-submit when all digits are filled
  const otpFilled = otp.filter(d => d !== '').length;
  const otpStr = otp.join('');
  const handleVerify = useCallback(async () => {
    if (operationLoading) return;
    autoSubmittedOtpRef.current = otpStr;
    if (otpStr.length < OTP_LENGTH) {
      Haptic.warning();
      shake();
      showAlert('Incomplete Code', `Please enter all ${OTP_LENGTH} digits.`);
      return;
    }
    Haptic.confirm();
    const { error, requiresProfileSetup } = await verifyOTP(email.trim().toLowerCase(), otpStr);
    if (error) {
      Haptic.error();
      shake();
      showAlert('Invalid Code', error);
      autoSubmittedOtpRef.current = null;
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
      return;
    }
    Haptic.success();
    pulseSuccess();
    router.replace(requiresProfileSetup ? '/profile-setup' : '/(tabs)');
  }, [email, operationLoading, otpStr, pulseSuccess, router, shake, showAlert, verifyOTP]);

  useEffect(() => {
    if (
      otpFilled === OTP_LENGTH
      && step === 'otp'
      && !operationLoading
      && autoSubmittedOtpRef.current !== otpStr
    ) {
      autoSubmittedOtpRef.current = otpStr;
      const timer = setTimeout(() => {
        void handleVerify();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [handleVerify, operationLoading, otpFilled, otpStr, step]);

  const handleBack = () => {
    autoSubmittedOtpRef.current = null;
    setStep('email');
    setOtp(Array(OTP_LENGTH).fill(''));
    animateBack();
    Haptic.tap();
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    autoSubmittedOtpRef.current = null;
    setOtp(Array(OTP_LENGTH).fill(''));
    const { error } = await sendOTP(email.trim().toLowerCase());
    if (!error) {
      Haptic.success();
      startCooldown();
      showAlert('Code Resent', `A new ${OTP_LENGTH}-digit code was sent to ${email}.`);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } else {
      Haptic.error();
      showAlert('Could Not Resend', error);
    }
  };

  const handlePasteOTP = async () => {
    try {
      const text = await Clipboard.getString();
      const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (digits.length > 0) {
        autoSubmittedOtpRef.current = null;
        const newOtp = Array(OTP_LENGTH).fill('');
        for (let i = 0; i < digits.length; i++) newOtp[i] = digits[i];
        setOtp(newOtp);
        Haptic.confirm();
        // Focus the next box after last pasted
        const nextIdx = Math.min(digits.length, OTP_LENGTH - 1);
        otpRefs.current[nextIdx]?.focus();
      }
    } catch {}
  };

  const emailSlideX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -W] });
  const otpSlideX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [W, 0] });

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: C.background }]}
        behavior="padding"
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Hero ── */}
          <Animated.View style={[styles.hero, { paddingTop: insets.top + Spacing.lg, opacity: heroFade.opacity, transform: heroFade.transform }]}>
            <LinearGradient
              colors={isDark
                ? [C.primarySubtle, 'transparent']
                : ['rgba(37,99,235,0.06)', 'transparent']
              }
              style={StyleSheet.absoluteFillObject}
            />

            {/* Brand */}
            <View style={styles.brandRow}>
              <Animated.View style={[styles.logoBox, { overflow: 'hidden', transform: [{ scale: logoBreathing }] }]}>
                <LinearGradient colors={Gradients.primaryVibrant} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <MaterialIcons name="local-shipping" size={26} color="#fff" />
              </Animated.View>
              <View>
                <Text style={[styles.brandName, { color: C.textPrimary }]}>CarryGo</Text>
                <Text style={[styles.brandTag, { color: C.textMuted }]}>Peer-to-peer delivery</Text>
              </View>
            </View>

            {/* Headline */}
            <View style={styles.heroText}>
              <Text style={[styles.heroTitle, { color: C.textPrimary }]}>
                Ship smarter,{'\n'}earn while travelling
              </Text>
              <Text style={[styles.heroSub, { color: C.textSecondary }]}>
                Connect with real travellers on your route. No courier fees, just trust.
              </Text>
            </View>

            {/* Feature pills */}
            <View style={styles.featurePills}>
              {FEATURES.map((f, i) => (
                <View key={i} style={[styles.featurePill, { backgroundColor: C.primarySubtle, borderColor: C.primary + '30' }]}>
                  <MaterialIcons name={f.icon} size={12} color={C.primary} />
                  <Text style={[styles.featurePillText, { color: C.primary }]}>{f.text}</Text>
                </View>
              ))}
            </View>

            {/* Stats */}
            <View style={[styles.statsCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
              {[
                { val: '2K+', label: 'Deliveries', icon: 'local-shipping' as const },
                { val: '500+', label: 'Travellers', icon: 'directions-car' as const },
                { val: '4.8★', label: 'Avg Rating', icon: 'star' as const },
              ].map((s, i) => (
                <React.Fragment key={i}>
                  <View style={styles.statItem}>
                    <MaterialIcons name={s.icon} size={14} color={C.primary} />
                    <Text style={[styles.statVal, { color: C.textPrimary }]}>{s.val}</Text>
                    <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
                  </View>
                  {i < 2 ? <View style={[styles.statDivider, { backgroundColor: C.surfaceBorder }]} /> : null}
                </React.Fragment>
              ))}
            </View>
          </Animated.View>

          {/* ── Sliding Form ── */}
          <Animated.View style={[styles.formOuter, { transform: [{ translateX: shakeAnim }], opacity: formFade.opacity }]}>
            {/* ── Email Step ── */}
            <Animated.View style={[styles.formSlide, { transform: [{ translateX: emailSlideX }] }]}>
              <View style={[styles.formCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                <View style={styles.formHeaderRow}>
                  <View style={[styles.stepIconBox, { backgroundColor: C.primarySubtle }]}>
                    <MaterialIcons name="email" size={20} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formTitle, { color: C.textPrimary }]}>Sign in or Register</Text>
                    <Text style={[styles.formSub, { color: C.textSecondary }]}>
                      Enter your email — we will send a {OTP_LENGTH}-digit code
                    </Text>
                  </View>
                </View>

                <View style={[
                  styles.emailWrap,
                  {
                    backgroundColor: emailFocused ? C.primarySubtle : C.inputBg,
                    borderColor: emailFocused ? C.primary : C.surfaceBorder,
                  },
                ]}>
                  <MaterialIcons name="alternate-email" size={17} color={emailFocused ? C.primary : C.textMuted} />
                  <TextInput
                    style={[styles.emailInput, { color: C.textPrimary }]}
                    placeholder="your@email.com"
                    placeholderTextColor={C.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    onSubmitEditing={handleSendOTP}
                    returnKeyType="send"
                  />
                  {email.length > 0 ? (
                    <Pressable onPress={() => setEmail('')} hitSlop={10}>
                      <View style={[styles.clearBtn, { backgroundColor: C.surfaceBorderLight }]}>
                        <MaterialIcons name="close" size={12} color={C.textMuted} />
                      </View>
                    </Pressable>
                  ) : null}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { overflow: 'hidden' },
                    (!email.trim() || operationLoading) && { opacity: 0.4 },
                    pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={handleSendOTP}
                  disabled={operationLoading || !email.trim()}
                >
                  <LinearGradient
                    colors={Gradients.primaryVibrant}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }}
                  />
                  <Text style={styles.primaryBtnText}>
                    {operationLoading ? 'Sending code…' : `Send ${OTP_LENGTH}-Digit Code`}
                  </Text>
                  {!operationLoading ? <MaterialIcons name="arrow-forward" size={17} color="#fff" /> : null}
                </Pressable>

                <View style={styles.trustRow}>
                  {[
                    { icon: 'lock' as const, text: 'No password needed' },
                    { icon: 'security' as const, text: 'Secure & private' },
                  ].map((t, i) => (
                    <View key={i} style={styles.trustItem}>
                      <MaterialIcons name={t.icon} size={11} color={C.textMuted} />
                      <Text style={[styles.trustText, { color: C.textMuted }]}>{t.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>

            {/* ── OTP Step ── */}
            <Animated.View style={[styles.formSlide, styles.formSlideAbs, { transform: [{ translateX: otpSlideX }] }]}>
              <Animated.View style={[styles.formCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, { transform: [{ scale: successScale }] }]}>
                <Pressable onPress={handleBack} style={styles.backRow} hitSlop={10}>
                  <MaterialIcons name="arrow-back-ios" size={13} color={C.primary} />
                  <Text style={[styles.backText, { color: C.primary }]}>Change email</Text>
                </Pressable>

                <View style={styles.formHeaderRow}>
                  <View style={[styles.stepIconBox, { backgroundColor: C.successSubtle }]}>
                    <MaterialIcons name="mark-email-read" size={20} color={C.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formTitle, { color: C.textPrimary }]}>Check your inbox</Text>
                    <Text style={[styles.formSub, { color: C.textSecondary }]} numberOfLines={2}>
                      We sent a {OTP_LENGTH}-digit code to{'\n'}
                      <Text style={{ color: C.primary, fontWeight: FontWeight.semibold }}>{email}</Text>
                    </Text>
                  </View>
                </View>

                {/* OTP boxes */}
                <View style={styles.otpRow}>
                  {otp.map((digit, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => otpRefs.current[idx]?.focus()}
                      style={[
                        styles.otpBox,
                        {
                          backgroundColor: digit ? C.primarySubtle : C.inputBg,
                          borderColor: digit ? C.primary : C.surfaceBorder,
                        },
                      ]}
                    >
                      <TextInput
                        ref={ref => { otpRefs.current[idx] = ref; }}
                        style={[styles.otpInput, { color: C.textPrimary }]}
                        value={digit}
                        onChangeText={val => handleOtpChange(val, idx)}
                        onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, idx)}
                        keyboardType="number-pad"
                        maxLength={OTP_LENGTH}
                        selectTextOnFocus
                        textAlign="center"
                        caretHidden
                      />
                    </Pressable>
                  ))}
                </View>

                {/* Progress bar */}
                <View style={[styles.otpProgressTrack, { backgroundColor: C.surfaceBorder }]}>
                  <Animated.View style={[
                    styles.otpProgressFill,
                    {
                      width: `${(otpFilled / OTP_LENGTH) * 100}%` as any,
                      backgroundColor: otpFilled === OTP_LENGTH ? C.success : C.primary,
                    },
                  ]} />
                </View>

                {/* Digit count */}
                <Text style={[styles.otpCount, { color: C.textMuted }]}>
                  {otpFilled}/{OTP_LENGTH} digits entered
                  {otpFilled === OTP_LENGTH ? ' · Verifying…' : ''}
                </Text>

                {/* Verify button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { overflow: 'hidden', backgroundColor: otpFilled === OTP_LENGTH ? C.success : C.primary },
                    otpFilled < OTP_LENGTH && { opacity: 0.4 },
                    pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={handleVerify}
                  disabled={operationLoading || otpFilled < OTP_LENGTH}
                >
                  {operationLoading ? (
                    <Text style={styles.primaryBtnText}>Verifying…</Text>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                    </>
                  )}
                </Pressable>

                {/* Paste & Resend row */}
                <View style={styles.actionsRow}>
                  {/* Paste from clipboard */}
                  <Pressable
                    style={[styles.actionPill, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
                    onPress={handlePasteOTP}
                    hitSlop={8}
                  >
                    <MaterialIcons name="content-paste" size={13} color={C.textSecondary} />
                    <Text style={[styles.actionPillText, { color: C.textSecondary }]}>Paste code</Text>
                  </Pressable>

                  {/* Resend with cooldown */}
                  <Pressable
                    style={[
                      styles.actionPill,
                      {
                        backgroundColor: cooldown > 0 ? C.surfaceElevated : C.primarySubtle,
                        borderColor: cooldown > 0 ? C.surfaceBorder : C.primary + '55',
                        opacity: cooldown > 0 ? 0.6 : 1,
                      },
                    ]}
                    onPress={handleResend}
                    disabled={cooldown > 0 || operationLoading}
                    hitSlop={8}
                  >
                    <MaterialIcons
                      name={cooldown > 0 ? 'timer' : 'refresh'}
                      size={13}
                      color={cooldown > 0 ? C.textMuted : C.primary}
                    />
                    <Text style={[styles.actionPillText, { color: cooldown > 0 ? C.textMuted : C.primary }]}>
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                    </Text>
                  </Pressable>
                </View>

                {/* Expiry hint */}
                <View style={styles.expiryRow}>
                  <Ionicons name="time-outline" size={12} color={C.textMuted} />
                  <Text style={[styles.expiryText, { color: C.textMuted }]}>
                    Code expires in 60 minutes · Check spam folder if not received
                  </Text>
                </View>
              </Animated.View>
            </Animated.View>
          </Animated.View>

          <Text style={[styles.terms, { color: C.textMuted, marginTop: Spacing.md }]}>
            By continuing you agree to CarryGo&apos;s{'\n'}Terms of Service and Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },

  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
    overflow: 'hidden',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  logoBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 26, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  brandTag: { fontSize: FontSize.sm, marginTop: 1 },
  heroText: { gap: 8 },
  heroTitle: { fontSize: FontSize.display, fontWeight: FontWeight.extrabold, letterSpacing: -1, lineHeight: 46 },
  heroSub: { fontSize: FontSize.sm, lineHeight: 21 },
  featurePills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  featurePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  featurePillText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  statsCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1,
  },
  statItem: { alignItems: 'center', gap: 3 },
  statVal: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  statLabel: { fontSize: FontSize.xs },
  statDivider: { width: 1, height: 36 },

  formOuter: { overflow: 'hidden', paddingHorizontal: Spacing.md, minHeight: 500 },
  formSlide: { width: '100%' },
  formSlideAbs: { position: 'absolute', top: 0, left: Spacing.md, right: Spacing.md },
  formCard: { borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, gap: Spacing.sm + 4 },
  formHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  stepIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  formTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  formSub: { fontSize: FontSize.xs, marginTop: 2, lineHeight: 17 },

  emailWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 1.5,
    paddingHorizontal: Spacing.md, minHeight: 54,
  },
  emailInput: { flex: 1, fontSize: FontSize.md, paddingVertical: Spacing.sm },
  clearBtn: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderRadius: BorderRadius.md, paddingVertical: Spacing.md + 2,
  },
  primaryBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },

  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { fontSize: FontSize.xs },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  // OTP grid — 6 boxes
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  otpBox: {
    width: 46, height: 58, borderRadius: BorderRadius.md, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  otpInput: {
    width: '100%', height: '100%', textAlign: 'center',
    fontSize: 24, fontWeight: FontWeight.bold,
  },

  otpProgressTrack: { height: 3, borderRadius: 2, overflow: 'hidden', marginHorizontal: Spacing.sm },
  otpProgressFill: { height: '100%', borderRadius: 2 },
  otpCount: { fontSize: FontSize.xs, textAlign: 'center', marginTop: -Spacing.xs },

  actionsRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  actionPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  expiryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, marginTop: -Spacing.xs,
  },
  expiryText: { fontSize: FontSize.xs, textAlign: 'center', flex: 1, lineHeight: 16 },

  terms: { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18, paddingHorizontal: Spacing.xl },
});
