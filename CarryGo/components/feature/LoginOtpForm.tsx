import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing, BorderRadius, ThemeColors } from '@/constants/theme';
import Reanimated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

type LoginOtpFormProps = {
  email: string;
  otp: string[];
  otpLength: number;
  otpFilled: number;
  operationLoading: boolean;
  cooldown: number;
  successScale: Animated.Value;
  onBack: () => void;
  onOtpChange: (val: string, idx: number) => void;
  onOtpKeyPress: (key: string, idx: number) => void;
  onVerify: () => void;
  onPaste: () => void;
  onResend: () => void;
  otpRefs: React.MutableRefObject<(TextInput | null)[]>;
  C: ThemeColors;
};

export function LoginOtpForm({
  email,
  otp,
  otpLength,
  otpFilled,
  operationLoading,
  cooldown,
  successScale,
  onBack,
  onOtpChange,
  onOtpKeyPress,
  onVerify,
  onPaste,
  onResend,
  otpRefs,
  C,
}: LoginOtpFormProps) {
  const progressStyle = useAnimatedStyle(
    () => ({
      width: withSpring(`${(otpFilled / otpLength) * 100}%`, { damping: 18, stiffness: 150 }),
    }),
    [otpFilled, otpLength],
  );

  return (
    <Animated.View style={[styles.formCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, { transform: [{ scale: successScale }] }]}>
      <Pressable onPress={onBack} style={styles.backRow} hitSlop={10}>
        <MaterialIcons name={'arrow-back-ios'} size={13} color={C.primary} />
        <Text style={[styles.backText, { color: C.primary }]}>Change email</Text>
      </Pressable>

      <View style={styles.formHeaderRow}>
        <View style={[styles.stepIconBox, { backgroundColor: C.successSubtle }]}>
          <MaterialIcons name={'mark-email-read'} size={20} color={C.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.formTitle, { color: C.textPrimary }]}>Check your inbox</Text>
          <Text style={[styles.formSub, { color: C.textSecondary }]} numberOfLines={2}>
            We sent a {otpLength}-digit code to{`\n`}
            <Text style={{ color: C.primary, fontWeight: FontWeight.semibold }}>{email}</Text>
          </Text>
        </View>
      </View>

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
              ref={(ref) => {
                otpRefs.current[idx] = ref;
              }}
              style={[styles.otpInput, { color: C.textPrimary }]}
              value={digit}
              onChangeText={(value) => onOtpChange(value, idx)}
              onKeyPress={({ nativeEvent }) => onOtpKeyPress(nativeEvent.key, idx)}
              keyboardType={'number-pad'}
              maxLength={otpLength}
              selectTextOnFocus
              textAlign={'center'}
              caretHidden
            />
          </Pressable>
        ))}
      </View>

      <View style={[styles.otpProgressTrack, { backgroundColor: C.surfaceBorder }]}>
        <Reanimated.View
          style={[
            styles.otpProgressFill,
            progressStyle,
            { backgroundColor: otpFilled === otpLength ? C.success : C.primary },
          ]}
        />
      </View>

      <Text style={[styles.otpCount, { color: C.textMuted }]}>
        {otpFilled}/{otpLength} digits entered
        {otpFilled === otpLength ? ' - verifying...' : ''}
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: otpFilled === otpLength ? C.success : C.primary },
          otpFilled < otpLength && { opacity: 0.4 },
          pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
        ]}
        onPress={onVerify}
        disabled={operationLoading || otpFilled < otpLength}
      >
        {operationLoading ? (
          <Text style={[styles.primaryBtnText, { color: C.textInverse }]}>Verifying...</Text>
        ) : (
          <>
            <Ionicons name={'checkmark-circle'} size={18} color={C.textInverse} />
            <Text style={[styles.primaryBtnText, { color: C.textInverse }]}>Verify and Continue</Text>
          </>
        )}
      </Pressable>

      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.actionPill, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}
          onPress={onPaste}
          hitSlop={8}
        >
          <MaterialIcons name={'content-paste'} size={13} color={C.textSecondary} />
          <Text style={[styles.actionPillText, { color: C.textSecondary }]}>Paste code</Text>
        </Pressable>

        <Pressable
          style={[
            styles.actionPill,
            {
              backgroundColor: cooldown > 0 ? C.surfaceElevated : C.primarySubtle,
              borderColor: cooldown > 0 ? C.surfaceBorder : C.primary + '55',
              opacity: cooldown > 0 ? 0.6 : 1,
            },
          ]}
          onPress={onResend}
          disabled={cooldown > 0 || operationLoading}
          hitSlop={8}
        >
          <MaterialIcons name={cooldown > 0 ? 'timer' : 'refresh'} size={13} color={cooldown > 0 ? C.textMuted : C.primary} />
          <Text style={[styles.actionPillText, { color: cooldown > 0 ? C.textMuted : C.primary }]}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.expiryRow}>
        <Ionicons name={'time-outline'} size={12} color={C.textMuted} />
        <Text style={[styles.expiryText, { color: C.textMuted }]}>Code expires in 60 minutes. Check spam if it does not arrive.</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  formCard: { borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, gap: Spacing.sm + 4 },
  formHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  stepIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  formTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  formSub: { fontSize: FontSize.xs, marginTop: 2, lineHeight: 17 },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  otpBox: {
    width: 46,
    height: 58,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  otpInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: FontWeight.bold,
  },

  otpProgressTrack: { height: 3, borderRadius: 2, overflow: 'hidden', marginHorizontal: Spacing.sm },
  otpProgressFill: { height: '100%', borderRadius: 2 },
  otpCount: { fontSize: FontSize.xs, textAlign: 'center', marginTop: -Spacing.xs },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 2,
  },
  primaryBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },

  actionsRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  actionPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: -Spacing.xs,
  },
  expiryText: { fontSize: FontSize.xs, textAlign: 'center', flex: 1, lineHeight: 16 },
});
