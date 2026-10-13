import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

const SECTIONS = [
  [
    'Service Model and Scope',
    'CarryGo operates a peer-to-peer parcel carriage platform connecting senders with verified travelers already travelling along the same route. CarryGo is an intermediary technology platform facilitating connections, verification, and escrow payments between community members.'
  ],
  [
    'Delivery Timelines and Estimates',
    'Delivery schedules are based on the individual traveler’s planned flight, train, bus, or road itinerary. Estimated delivery times provided in the app are indicative and subject to transit delays, traffic, weather events, and transport operator schedules.'
  ],
  [
    'Parcel Packaging and Declarations',
    'Senders must inspect, package, and securely seal all parcels prior to handover. Senders must truthfully declare package contents, weight, dimensions, and fragility. Travelers have the legal right to visually inspect items before accepting custody.'
  ],
  [
    'Prohibited and Restricted Items',
    'Dangerous goods, hazardous chemicals, flammables, explosives, contraband, illegal narcotics, unlicensed weapons, unregistered pharmaceuticals, and items prohibited under Indian transport laws or carrier regulations are strictly barred. Violations will be reported to law enforcement.'
  ],
  [
    'Pickup and Delivery Handover Protocols',
    'Handover must be recorded inside the CarryGo app. Senders confirm handover with photo verification, and recipients receive and confirm delivery by providing a secure delivery PIN to the traveler. Escrow payment is only released upon verified delivery PIN confirmation.'
  ],
  [
    'Delayed, Damaged, or Missing Deliveries',
    'If a traveler experiences unexpected travel delays, they must notify the sender immediately through in-app chat. In the event of lost or damaged items, either party can initiate a dispute through the Support Desk for evidence review and mediation.'
  ],
] as const;

export default function ShippingPolicyScreen() {
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
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Shipping & Delivery</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.badge, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="local-shipping" size={16} color={C.primary} />
          <Text style={[styles.badgeText, { color: C.primary }]}>Updated: August 2026</Text>
        </View>
        <Text style={[styles.intro, { color: C.textSecondary }]}>
          This policy explains delivery terms, prohibited cargo, transit expectations, and handover protocols for peer-to-peer carriage on CarryGo.
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
          For delivery assistance or incident escalation, contact our team at support@carrygo.in.
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
