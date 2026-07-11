import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing, ThemeColors } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';
import {
  completeProfile,
  normalizeIndianMobile,
  normalizeUsername,
  validateUsername,
  isUsernameTaken,
} from '@/services/profile.service';
import { UserRole } from '@/types';

const { width: W } = Dimensions.get('window');

type Step = 'username' | 'name' | 'phone' | 'role';

const STEPS: Step[] = ['username', 'name', 'phone', 'role'];

const ROLES: { id: UserRole; icon: keyof typeof MaterialIcons.glyphMap; title: string; sub: string; color: string }[] = [
  {
    id: 'sender',
    icon: 'inventory-2',
    title: 'I want to send parcels',
    sub: 'Find travellers to carry my packages.',
    color: '#4F8EF7',
  },
  {
    id: 'traveller',
    icon: 'directions-car',
    title: 'I travel and earn',
    sub: 'Carry parcels on my route and earn.',
    color: '#22C55E',
  },
  {
    id: 'both',
    icon: 'swap-horiz',
    title: 'Both send and earn',
    sub: 'Use the full CarryGo experience.',
    color: '#F59E0B',
  },
];

function formatMobileInput(value?: string) {
  const digits = (value || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').slice(-10);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export default function ProfileSetupScreen() {
  const { user, updateUser, refreshUser } = useAuth();
  const { showAlert } = useAlert();
  const { C, isDark } = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('username');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const usernameRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    setUsername(user.username || '');
    setFullName(user.fullName || '');
    setPhone(formatMobileInput(user.phone));
    setRole(user.role || null);
  }, [router, user]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const slideTo = (nextStep: Step, direction: 'next' | 'prev' = 'next') => {
    const out = direction === 'next' ? -W : W;
    const incoming = direction === 'next' ? W : -W;
    Animated.timing(slideAnim, { toValue: out, duration: 200, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      slideAnim.setValue(incoming);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    });
  };

  const fail = (title: string, message: string) => {
    Haptic.error();
    shake();
    showAlert(title, message);
  };

  const handleUsernameNext = async () => {
    const normalized = normalizeUsername(username);
    const error = validateUsername(normalized);
    if (error) {
      fail('Username Required', error);
      return;
    }

    setLoading(true);
    const check = await isUsernameTaken(normalized, user?.id);
    setLoading(false);

    if (check.error) {
      fail('Validation Error', 'Could not check username availability. Please try again.');
      return;
    }
    if (check.taken) {
      fail('Username Taken', 'This username is already taken. Please choose another one.');
      return;
    }

    setUsername(normalized);
    Haptic.confirm();
    slideTo('name');
    setTimeout(() => nameRef.current?.focus(), 320);
  };

  const handleNameNext = () => {
    const normalizedName = fullName.trim().replace(/\s+/g, ' ');
    if (normalizedName.length < 2) {
      fail('Name Required', 'Please enter your full name.');
      return;
    }
    if (normalizedName.split(' ').length < 2) {
      fail('Full Name Required', 'Please enter both your first and last name.');
      return;
    }
    setFullName(normalizedName);
    Haptic.confirm();
    slideTo('phone');
    setTimeout(() => phoneRef.current?.focus(), 320);
  };

  const handlePhoneNext = () => {
    if (!normalizeIndianMobile(phone)) {
      fail('Invalid Mobile Number', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    Haptic.confirm();
    slideTo('role');
  };

  const handleBack = () => {
    const current = STEPS.indexOf(step);
    if (current <= 0) return;
    Haptic.tap();
    slideTo(STEPS[current - 1], 'prev');
  };

  const handleFinish = async () => {
    if (!user?.id) return;
    if (!role) {
      fail('Choose Your Role', 'Please select how you plan to use CarryGo.');
      return;
    }

    setLoading(true);
    Haptic.confirm();
    const { data, error } = await completeProfile(user.id, {
      username,
      fullName,
      phone,
      role,
    });
    setLoading(false);

    if (error) {
      fail('Could Not Save Profile', error);
      return;
    }

    if (data) updateUser(data);
    await refreshUser();
    Haptic.success();
    router.replace('/(tabs)');
  };

  if (!user) return null;

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const usernameValue = normalizeUsername(username);
  const usernameReady = usernameValue.length > 0 && !validateUsername(usernameValue);
  const phoneReady = Boolean(normalizeIndianMobile(phone));

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: C.background }]}
        behavior="padding"
      >
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: C.background, borderBottomColor: C.surfaceBorder }]}>
          {stepIndex > 0 ? (
            <Pressable
              style={[styles.backBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
              onPress={handleBack}
              hitSlop={10}
            >
              <MaterialIcons name="arrow-back-ios" size={15} color={C.textSecondary} />
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}

          <View style={styles.stepPills}>
            {STEPS.map((item, index) => (
              <View
                key={item}
                style={[
                  styles.stepPill,
                  {
                    backgroundColor: index <= stepIndex ? C.primary : C.surfaceBorderLight,
                    width: index === stepIndex ? 28 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <Text style={[styles.stepCounter, { color: C.textMuted }]}>{stepIndex + 1} / {STEPS.length}</Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: C.surfaceBorderLight }]}>
          <Animated.View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: C.primary }]} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.slideWrap, { transform: [{ translateX: slideAnim }, { translateX: shakeAnim }] }]}>
            {step === 'username' ? (
              <View style={styles.stepContent}>
                <Hero
                  C={C}
                  icon="alternate-email"
                  color={C.primary}
                  title="Choose your username"
                  subtitle="This is your public CarryGo handle. Travellers and senders can identify you by it."
                />

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: C.textMuted }]}>Username</Text>
                  <View style={[styles.inputWrap, { backgroundColor: C.inputBg, borderColor: usernameReady ? C.primary : C.surfaceBorder }]}>
                    <Text style={[styles.atPrefix, { color: C.textMuted }]}>@</Text>
                    <TextInput
                      ref={usernameRef}
                      style={[styles.inputField, { color: C.textPrimary }]}
                      placeholder="rahul_sharma"
                      placeholderTextColor={C.textMuted}
                      value={username}
                      onChangeText={text => setUsername(normalizeUsername(text).replace(/[^a-z0-9_]/g, ''))}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="username"
                      returnKeyType="next"
                      maxLength={24}
                      onSubmitEditing={handleUsernameNext}
                      autoFocus
                    />
                    {usernameReady ? <MaterialIcons name="check-circle" size={18} color={C.primary} /> : null}
                  </View>
                  <Text style={[styles.inputHint, { color: C.textMuted }]}>3-24 lowercase letters, numbers, or underscores</Text>
                </View>

                <PrimaryButton
                  color={C.primary}
                  disabled={!usernameReady || loading}
                  loading={loading}
                  label="Continue"
                  onPress={handleUsernameNext}
                />
              </View>
            ) : null}

            {step === 'name' ? (
              <View style={styles.stepContent}>
                <Hero
                  C={C}
                  icon="person"
                  color={C.primary}
                  title="What's your name?"
                  subtitle="Use your real name to build trust with people who send or carry parcels."
                />

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: C.textMuted }]}>Full Name</Text>
                  <View style={[styles.inputWrap, { backgroundColor: C.inputBg, borderColor: fullName.trim() ? C.primary : C.surfaceBorder }]}>
                    <MaterialIcons name="badge" size={18} color={fullName.trim() ? C.primary : C.textMuted} />
                    <TextInput
                      ref={nameRef}
                      style={[styles.inputField, { color: C.textPrimary }]}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor={C.textMuted}
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                      autoComplete="name"
                      returnKeyType="next"
                      maxLength={60}
                      onSubmitEditing={handleNameNext}
                    />
                  </View>
                  <Text style={[styles.inputHint, { color: C.textMuted }]}>Enter your first and last name</Text>
                </View>

                <PrimaryButton
                  color={C.primary}
                  disabled={fullName.trim().length < 2}
                  label="Continue"
                  onPress={handleNameNext}
                />
              </View>
            ) : null}

            {step === 'phone' ? (
              <View style={styles.stepContent}>
                <Hero
                  C={C}
                  icon="phone-android"
                  color="#22C55E"
                  title="Your mobile number"
                  subtitle="Used for delivery coordination and account recovery after a confirmed match."
                />

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: C.textMuted }]}>Mobile Number</Text>
                  <View style={[styles.inputWrap, { backgroundColor: C.inputBg, borderColor: phoneReady ? '#22C55E' : C.surfaceBorder }]}>
                    <View style={[styles.countryCode, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                      <Text style={[styles.countryCodeText, { color: C.textPrimary }]}>+91</Text>
                    </View>
                    <TextInput
                      ref={phoneRef}
                      style={[styles.inputField, { color: C.textPrimary }]}
                      placeholder="98765 43210"
                      placeholderTextColor={C.textMuted}
                      value={phone}
                      onChangeText={text => setPhone(formatMobileInput(text))}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      returnKeyType="next"
                      maxLength={11}
                      onSubmitEditing={handlePhoneNext}
                    />
                    {phoneReady ? <MaterialIcons name="check-circle" size={18} color="#22C55E" /> : null}
                  </View>
                  <Text style={[styles.inputHint, { color: C.textMuted }]}>10-digit Indian mobile number</Text>
                </View>

                <View style={[styles.trustNote, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                  <MaterialIcons name="lock" size={13} color={C.textMuted} />
                  <Text style={[styles.trustNoteText, { color: C.textMuted }]}>
                    Your number is only shared with a matched delivery partner after both sides confirm the request.
                  </Text>
                </View>

                <PrimaryButton
                  color="#22C55E"
                  disabled={!phoneReady}
                  label="Continue"
                  onPress={handlePhoneNext}
                />
              </View>
            ) : null}

            {step === 'role' ? (
              <View style={styles.stepContent}>
                <Hero
                  C={C}
                  icon="swap-horiz"
                  color="#F59E0B"
                  title="How will you use CarryGo?"
                  subtitle="This helps us personalise your home screen. You can change it later."
                />

                <View style={styles.roleGrid}>
                  {ROLES.map(item => (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [
                        styles.roleCard,
                        {
                          backgroundColor: role === item.id ? item.color + '14' : C.surface,
                          borderColor: role === item.id ? item.color : C.surfaceBorder,
                          borderWidth: role === item.id ? 2 : 1,
                        },
                        pressed && { transform: [{ scale: 0.97 }] },
                      ]}
                      onPress={() => {
                        Haptic.select();
                        setRole(item.id);
                      }}
                    >
                      <View style={[styles.roleIconWrap, { backgroundColor: item.color + '18' }]}>
                        <MaterialIcons name={item.icon} size={24} color={item.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.roleTitle, { color: C.textPrimary }]}>{item.title}</Text>
                        <Text style={[styles.roleSub, { color: C.textSecondary }]}>{item.sub}</Text>
                      </View>
                      {role === item.id ? (
                        <MaterialIcons name="check-circle" size={20} color={item.color} />
                      ) : (
                        <View style={[styles.roleRadio, { borderColor: C.surfaceBorderLight }]} />
                      )}
                    </Pressable>
                  ))}
                </View>

                {role ? (
                  <View style={[styles.summaryCard, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
                    <MaterialIcons name="person-pin" size={16} color={C.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.summaryLine, { color: C.textPrimary }]}>
                        @{usernameValue} - {fullName}
                      </Text>
                      <Text style={[styles.summaryLineSub, { color: C.textSecondary }]}>
                        {normalizeIndianMobile(phone)} - {ROLES.find(item => item.id === role)?.title}
                      </Text>
                    </View>
                    <MaterialIcons name="check-circle" size={18} color="#22C55E" />
                  </View>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.ctaBtn,
                    { overflow: 'hidden', opacity: (!role || loading || pressed) ? 0.6 : 1 },
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={handleFinish}
                  disabled={!role || loading}
                >
                  <LinearGradient
                    colors={[C.primary, '#1D4ED8']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <MaterialIcons name="rocket-launch" size={18} color="#fff" />
                  )}
                  <Text style={styles.ctaBtnText}>{loading ? 'Setting up your account...' : 'Enter CarryGo'}</Text>
                </Pressable>
              </View>
            ) : null}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Hero({
  C,
  icon,
  color,
  title,
  subtitle,
}: {
  C: ThemeColors;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.heroSection}>
      <View style={[styles.iconCircle, { backgroundColor: color + '18', borderColor: color + '33' }]}>
        <LinearGradient colors={[color + '30', color + '10']} style={StyleSheet.absoluteFillObject} />
        <MaterialIcons name={icon} size={38} color={color} />
      </View>
      <Text style={[styles.stepTitle, { color: C.textPrimary }]}>{title}</Text>
      <Text style={[styles.stepSub, { color: C.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

function PrimaryButton({
  color,
  disabled,
  label,
  onPress,
  loading,
}: {
  color: string;
  disabled: boolean;
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.ctaBtn,
        { backgroundColor: color, opacity: (disabled || loading || pressed) ? 0.5 : 1 },
        pressed && !disabled && !loading && { transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          <Text style={styles.ctaBtnText}>{label}</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepPills: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stepPill: { height: 7, borderRadius: 4 },
  stepCounter: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, minWidth: 36, textAlign: 'right' },
  progressTrack: { height: 2 },
  progressFill: { height: '100%', borderRadius: 1 },
  scroll: { flexGrow: 1 },
  slideWrap: { flex: 1 },
  stepContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.xl,
  },
  heroSection: { alignItems: 'center', gap: Spacing.md },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  stepSub: {
    fontSize: FontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  inputGroup: { gap: Spacing.sm },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    minHeight: 58,
  },
  atPrefix: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  inputField: { flex: 1, fontSize: FontSize.md, paddingVertical: Spacing.sm },
  inputHint: { fontSize: FontSize.xs },
  countryCode: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 4,
  },
  countryCodeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  trustNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  trustNoteText: { flex: 1, fontSize: FontSize.xs, lineHeight: 18 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 4,
    marginTop: Spacing.sm,
  },
  ctaBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },
  roleGrid: { gap: Spacing.md },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 2,
  },
  roleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roleTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  roleSub: { fontSize: FontSize.xs, marginTop: 2, lineHeight: 17 },
  roleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    flexShrink: 0,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginTop: -Spacing.sm,
  },
  summaryLine: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  summaryLineSub: { fontSize: FontSize.xs, marginTop: 2 },
});
