import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  TextInput, Animated, Dimensions, Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius, Gradients } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Haptic } from '@/services/haptics.service';
import { StatusBar } from 'expo-status-bar';
import { AUTH_OTP_LENGTH } from '@/constants/security';
import { DELAYS } from '@/constants/timing';
import { useBreathing, useFadeIn } from '@/hooks/useAnimations';
import { LoginEmailForm } from '@/components/feature/LoginEmailForm';
import { LoginOtpForm } from '@/components/feature/LoginOtpForm';

type Step = 'email' | 'otp';
const OTP_LENGTH = AUTH_OTP_LENGTH;
const RESEND_COOLDOWN = 60;
const { width: W } = Dimensions.get('window');

const FEATURES = [
  { icon: 'route' as const, text: 'Route-matched deliveries' },
  { icon: 'account-balance-wallet' as const, text: 'Earn while you travel' },
  { icon: 'verified-user' as const, text: 'Trusted community' },
];

export default function LoginScreen() {
  const { sendOTP, verifyOTP } = useAuth();
  const { showAlert } = useAlert();
  const { C, isDark } = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [operationLoading, setOperationLoading] = useState(false);

  const logoBreathing = useBreathing(0.94, 1, 3200);
  const heroFade = useFadeIn(0, 600);
  const formFade = useFadeIn(200, 500);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [emailFocused, setEmailFocused] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const autoSubmittedOtpRef = useRef<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(1)).current;
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
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

  const startCooldown = () => setCooldown(RESEND_COOLDOWN);

  const handleSendOTP = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Haptic.error(); shake();
      showAlert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    Haptic.confirm();
    setOperationLoading(true);
    const { error } = await sendOTP(email.trim().toLowerCase());
    setOperationLoading(false);
    if (error) { Haptic.error(); shake(); showAlert('Could Not Send Code', error); return; }
    startCooldown();
    autoSubmittedOtpRef.current = null;
    setStep('otp');
    animateToOTP();
    Haptic.success();
    setTimeout(() => otpRefs.current[0]?.focus(), 400);
  };

  const handleOtpChange = useCallback((val: string, idx: number) => {
    autoSubmittedOtpRef.current = null;
    const digits = val.replace(/\D/g, '');
    if (digits.length > 1) {
      const newOtp = [...otp];
      for (let i = 0; i < digits.length && idx + i < OTP_LENGTH; i++) newOtp[idx + i] = digits[i];
      setOtp(newOtp);
      const nextIdx = Math.min(idx + digits.length, OTP_LENGTH - 1);
      otpRefs.current[nextIdx]?.focus();
      if (newOtp.every(d => d !== '')) Haptic.success();
      return;
    }
    const cleaned = digits.slice(-1);
    const newOtp = [...otp];
    newOtp[idx] = cleaned;
    setOtp(newOtp);
    if (cleaned) { Haptic.select(); if (idx < OTP_LENGTH - 1) otpRefs.current[idx + 1]?.focus(); }
  }, [otp]);

  const handleOtpKeyPress = useCallback((key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      const newOtp = [...otp];
      newOtp[idx - 1] = '';
      setOtp(newOtp);
      otpRefs.current[idx - 1]?.focus();
    }
  }, [otp]);

  const otpFilled = otp.filter(d => d !== '').length;
  const otpStr = otp.join('');

  const handleVerify = useCallback(async () => {
    if (operationLoading) return;
    autoSubmittedOtpRef.current = otpStr;
    if (otpStr.length < OTP_LENGTH) {
      Haptic.warning(); shake();
      showAlert('Incomplete Code', `Please enter all ${OTP_LENGTH} digits.`);
      return;
    }
    Haptic.confirm();
    setOperationLoading(true);
    const { error, requiresProfileSetup } = await verifyOTP(email.trim().toLowerCase(), otpStr);
    setOperationLoading(false);
    if (error) {
      Haptic.error(); shake();
      showAlert('Invalid Code', error);
      autoSubmittedOtpRef.current = null;
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
      return;
    }
    Haptic.success(); pulseSuccess();
    router.replace(requiresProfileSetup ? '/profile-setup' : '/(tabs)');
  }, [email, operationLoading, otpStr, pulseSuccess, router, shake, showAlert, verifyOTP]);

  useEffect(() => {
    if (otpFilled === OTP_LENGTH && step === 'otp' && !operationLoading && autoSubmittedOtpRef.current !== otpStr) {
      const capturedOtp = otpStr;
      const timer = setTimeout(() => {
        const currentOtp = otp.join('');
        if (currentOtp !== capturedOtp || currentOtp.length < OTP_LENGTH) return;
        if (autoSubmittedOtpRef.current === currentOtp) return;
        autoSubmittedOtpRef.current = currentOtp;
        void handleVerify();
      }, DELAYS.OTP_AUTO_SUBMIT);
      return () => clearTimeout(timer);
    }
  }, [handleVerify, operationLoading, otp, otpFilled, otpStr, step]);

  const handleBack = () => {
    autoSubmittedOtpRef.current = null;
    setStep('email'); setOtp(Array(OTP_LENGTH).fill(''));
    animateBack(); Haptic.tap();
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    autoSubmittedOtpRef.current = null;
    setOtp(Array(OTP_LENGTH).fill(''));
    const { error } = await sendOTP(email.trim().toLowerCase());
    if (!error) {
      Haptic.success(); startCooldown();
      showAlert('Code Resent', `A new ${OTP_LENGTH}-digit code was sent to ${email}.`);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } else { Haptic.error(); showAlert('Could Not Resend', error); }
  };

  const handlePasteOTP = async () => {
    try {
      const text = await Clipboard.getString();
      const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (digits.length > 0) {
        autoSubmittedOtpRef.current = null;
        const newOtp = Array(OTP_LENGTH).fill('');
        for (let i = 0; i < digits.length; i++) newOtp[i] = digits[i];
        setOtp(newOtp); Haptic.confirm();
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
      <KeyboardAvoidingView style={[styles.root, { backgroundColor: C.background }]} behavior="padding">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <Animated.View style={[styles.hero, { paddingTop: insets.top + Spacing.lg, opacity: heroFade.opacity, transform: heroFade.transform }]}>
            <LinearGradient
              colors={isDark ? [C.primarySubtle, 'transparent'] : ['rgba(37,99,235,0.06)', 'transparent']}
              style={StyleSheet.absoluteFillObject}
            />
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
            <View style={styles.heroText}>
              <Text style={[styles.heroTitle, { color: C.textPrimary }]}>Ship smarter,{'\n'}earn while travelling</Text>
              <Text style={[styles.heroSub, { color: C.textSecondary }]}>Connect with real travellers on your route. No courier fees, just trust.</Text>
            </View>
            <View style={styles.featurePills}>
              {FEATURES.map((f, i) => (
                <View key={i} style={[styles.featurePill, { backgroundColor: C.primarySubtle, borderColor: C.primary + '30' }]}>
                  <MaterialIcons name={f.icon} size={12} color={C.primary} />
                  <Text style={[styles.featurePillText, { color: C.primary }]}>{f.text}</Text>
                </View>
              ))}
            </View>
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

          {/* Sliding Form */}
          <Animated.View style={[styles.formOuter, { transform: [{ translateX: shakeAnim }], opacity: formFade.opacity }]}>
            <Animated.View style={[styles.formSlide, { transform: [{ translateX: emailSlideX }] }]}>
              <LoginEmailForm
                email={email}
                onEmailChange={setEmail}
                emailFocused={emailFocused}
                onEmailFocus={() => setEmailFocused(true)}
                onEmailBlur={() => setEmailFocused(false)}
                onSendOTP={handleSendOTP}
                operationLoading={operationLoading}
                otpLength={OTP_LENGTH}
                C={C}
              />
            </Animated.View>
            <Animated.View style={[styles.formSlide, styles.formSlideAbs, { transform: [{ translateX: otpSlideX }] }]}>
              <LoginOtpForm
                email={email}
                otp={otp}
                otpLength={OTP_LENGTH}
                otpFilled={otpFilled}
                operationLoading={operationLoading}
                cooldown={cooldown}
                successScale={successScale}
                onBack={handleBack}
                onOtpChange={handleOtpChange}
                onOtpKeyPress={handleOtpKeyPress}
                onVerify={handleVerify}
                onPaste={handlePasteOTP}
                onResend={handleResend}
                otpRefs={otpRefs}
                C={C}
              />
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
  hero: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.lg, overflow: 'hidden' },
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
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1,
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
  terms: { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18, paddingHorizontal: Spacing.xl },
});
