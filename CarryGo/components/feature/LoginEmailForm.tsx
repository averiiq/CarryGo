import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontSize, FontWeight, Spacing, BorderRadius, Gradients, ThemeColors } from '@/constants/theme';

type LoginEmailFormProps = {
  email: string;
  onEmailChange: (email: string) => void;
  emailFocused: boolean;
  onEmailFocus: () => void;
  onEmailBlur: () => void;
  onSendOTP: () => void;
  operationLoading: boolean;
  otpLength: number;
  C: ThemeColors;
};

export function LoginEmailForm({
  email,
  onEmailChange,
  emailFocused,
  onEmailFocus,
  onEmailBlur,
  onSendOTP,
  operationLoading,
  otpLength,
  C,
}: LoginEmailFormProps) {
  return (
    <View style={[styles.formCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={styles.formHeaderRow}>
        <View style={[styles.stepIconBox, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="email" size={20} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.formTitle, { color: C.textPrimary }]}>Sign in or Register</Text>
          <Text style={[styles.formSub, { color: C.textSecondary }]}>
            Enter your email — we will send a {otpLength}-digit code
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
          onChangeText={onEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          onFocus={onEmailFocus}
          onBlur={onEmailBlur}
          onSubmitEditing={onSendOTP}
          returnKeyType="send"
        />
        {email.length > 0 ? (
          <Pressable onPress={() => onEmailChange('')} hitSlop={10}>
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
        onPress={onSendOTP}
        disabled={operationLoading || !email.trim()}
      >
        <LinearGradient
          colors={Gradients.primaryVibrant}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }}
        />
        <Text style={styles.primaryBtnText}>
          {operationLoading ? 'Sending code…' : `Send ${otpLength}-Digit Code`}
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
  );
}

const styles = StyleSheet.create({
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
});
