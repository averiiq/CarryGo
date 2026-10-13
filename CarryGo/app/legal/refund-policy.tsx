import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

const SECTIONS = [
  [
    'Cancellation Before Pickup',
    'If a sender cancels before parcel pickup is confirmed by the traveler, CarryGo initiates a full refund of the locked escrow amount back to the original payment method. Payment processing times depend on payment gateway and bank clearing cycles (typically 3-7 business days).'
  ],
  [
    'Cancellation by Traveler',
    'If an accepted traveler cancels the journey before collecting the parcel, the sender is immediately notified and the full escrow deposit is automatically unreserved and refunded without cancellation penalties.'
  ],
  [
    'After Pickup and In-Transit Disputes',
    'Once a parcel is picked up, cancellations cannot be performed automatically. Any cancellations or issues must be escalated through Support Desk or Dispute Resolution. CarryGo reviews digital handover signatures, chat logs, and delivery evidence to determine refund allocation.'
  ],
  [
    'Completed Deliveries and Final Release',
    'Once the recipient confirms delivery via secure PIN handover and escrow funds are released to the traveler, refunds cannot be automatically reversed. Any allegations of policy violation or damaged goods must be submitted to Support for investigation.'
  ],
  [
    'Platform Fees and Chargebacks',
    'Valid cancellations processed before parcel pickup receive a full refund of platform and escrow fees. Fraudulent chargebacks or payment disputes filed in bad faith will lead to permanent account suspension and potential legal recovery.'
  ],
  [
    'How to Request Cancellation or Refund',
    'You can cancel pending requests directly in the CarryGo app from your Active Requests screen. For payment disputes or manual assistance, email support@carrygo.in with your request ID, tracking reference, and incident details.'
  ],
] as const;

export default function RefundPolicyScreen() {
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
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Refund & Cancellation</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.badge, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="replay" size={16} color={C.primary} />
          <Text style={[styles.badgeText, { color: C.primary }]}>Updated: August 2026</Text>
        </View>
        <Text style={[styles.intro, { color: C.textSecondary }]}>
          This policy outlines cancellation eligibility, escrow refunds, and dispute resolution guidelines for peer-to-peer parcel carriage on CarryGo.
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
          For refund questions or dispute assistance, contact us anytime at support@carrygo.in.
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
