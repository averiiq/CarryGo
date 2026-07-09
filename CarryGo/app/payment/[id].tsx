import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { disabledFeatureMessage } from '@/constants/featureFlags';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useRequestQuery } from '@/features/requests/queries';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const { data: request } = useRequestQuery(id);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, Shadow.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={[styles.icon, { backgroundColor: C.warningSubtle, borderColor: C.warning + '55' }]}>
          <MaterialIcons name="construction" size={34} color={C.warning} />
        </View>
        <Text style={[styles.title, { color: C.textPrimary }]}>Payment Integration Unavailable</Text>
        <Text style={[styles.body, { color: C.textSecondary }]}>
          {disabledFeatureMessage.payments} No funds are collected, held, released, or refunded by this build.
        </Text>
      </View>

      {request ? (
        <View style={[styles.details, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <Text style={[styles.detailsTitle, { color: C.textPrimary }]}>Delivery Quote</Text>
          <View style={[styles.row, { borderBottomColor: C.surfaceBorder }]}>
            <Text style={[styles.label, { color: C.textMuted }]}>Sender</Text>
            <Text style={[styles.value, { color: C.textPrimary }]}>{request.senderName}</Text>
          </View>
          <View style={[styles.row, { borderBottomColor: C.surfaceBorder }]}>
            <Text style={[styles.label, { color: C.textMuted }]}>Traveller</Text>
            <Text style={[styles.value, { color: C.textPrimary }]}>{request.travellerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: C.textMuted }]}>Agreed amount</Text>
            <Text style={[styles.value, { color: C.success }]}>₹{request.price}</Text>
          </View>
          <Text style={[styles.disclaimer, { color: C.textMuted, backgroundColor: C.surfaceElevated }]}>
            This quote is informational only. It is not evidence of a completed or protected payment.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
  },
  icon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  body: {
    fontSize: FontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
  },
  details: {
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  detailsTitle: {
    marginBottom: Spacing.sm,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: FontSize.sm,
  },
  value: {
    flexShrink: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textAlign: 'right',
  },
  disclaimer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
});
