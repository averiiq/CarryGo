import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

const SECTIONS = [
  ['Information we collect', 'We collect account details, profile information, delivery details, messages, payment references, identity-verification documents, device tokens, and location only when a delivery feature requires it.'],
  ['How we use information', 'We use this information to operate CarryGo, match routes, secure deliveries, process payments, prevent fraud, provide support, and meet legal obligations.'],
  ['Sharing and processors', 'Information is shared only with delivery participants where necessary and with contracted providers such as Supabase, Expo, Cloudinary, and payment or identity-verification providers. We do not sell personal information.'],
  ['Location and permissions', 'Precise location is requested only for enabled delivery tracking. Camera access is used for parcel and verification images. You can revoke permissions in device settings.'],
  ['Retention and security', 'We retain records only as required for operations, disputes, fraud prevention, and applicable law. Sensitive credentials are stored using platform-protected storage and server access is restricted by authorization policies.'],
  ['Your choices', 'You may request access or correction of your personal information. You can permanently delete your account in the app from Profile > Delete Account, subject to legal retention requirements.'],
] as const;

export default function PrivacyScreen() {
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: C.surfaceBorder }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: C.surfaceElevated }]}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.badge, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="privacy-tip" size={16} color={C.primary} />
          <Text style={[styles.badgeText, { color: C.primary }]}>Effective Date: 29 August 2026</Text>
        </View>
        <Text style={[styles.intro, { color: C.textSecondary }]}>
          This policy explains how CarryGo handles personal information when you use the mobile application.
        </Text>
        {SECTIONS.map(([title, body], index) => (
          <View key={title} style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <Text style={[styles.number, { color: C.primary }]}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.cardContent}>
              <Text style={[styles.title, { color: C.textPrimary }]}>{title}</Text>
              <Text style={[styles.body, { color: C.textSecondary }]}>{body}</Text>
            </View>
          </View>
        ))}
        <Text style={[styles.contact, { color: C.textMuted }]}>
          For privacy questions, contact CarryGo support from the in-app help channel.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  headerSpacer: { width: 40 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  intro: { fontSize: FontSize.md, lineHeight: 24 },
  card: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.lg },
  number: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  cardContent: { flex: 1, gap: Spacing.xs },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  body: { fontSize: FontSize.sm, lineHeight: 21 },
  contact: { fontSize: FontSize.xs, lineHeight: 18, textAlign: 'center', marginTop: Spacing.sm },
});
