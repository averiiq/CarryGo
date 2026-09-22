import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { UserNotificationPreferences } from '@/types';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/notifications.service';

type PrefKey = keyof Omit<UserNotificationPreferences, 'userId' | 'updatedAt'>;

interface PrefItem {
  key: PrefKey;
  label: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  critical?: boolean;
}

interface PreferenceSection {
  title: string;
  items: PrefItem[];
}

export default function NotificationSettingsScreen() {
  const { C } = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [prefs, setPrefs] = useState<UserNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PrefKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPrefs = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchNotificationPreferences();
    if (fetchError || !data) {
      setError('Could not load your preferences. Please try again.');
    } else {
      setPrefs(data);
    }
    setLoading(false);
  };

  useEffect(() => { void loadPrefs(); }, []);

  const toggle = async (key: PrefKey) => {
    if (!prefs || saving) return;
    Haptic.tap();
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(key);
    const { error: saveError } = await updateNotificationPreferences(updated);
    setSaving(null);
    if (saveError) {
      setPrefs(prefs);
      setError('Failed to save. Please try again.');
    }
  };

  const sections: PreferenceSection[] = [
    {
      title: 'Matching & Discovery',
      items: [
        { key: 'enableMatches', label: 'Route Match Alerts', description: 'Notified when a traveller or sender matches your saved route corridor.', icon: 'map', color: '#6366F1' },
        { key: 'enableCityAlerts', label: 'City Activity', description: 'Get notified about new travel listings near your city.', icon: 'location-city', color: '#8B5CF6' },
      ],
    },
    {
      title: 'Deliveries',
      items: [
        { key: 'enableTripUpdates', label: 'Trip Updates', description: 'Alerts when a traveller updates or cancels their trip.', icon: 'directions-car', color: '#3B82F6' },
        { key: 'enableParcelUpdates', label: 'Parcel Updates', description: 'Pickup, transit, and delivery status changes for your parcels.', icon: 'inventory-2', color: '#10B981' },
      ],
    },
    {
      title: 'Communication',
      items: [
        { key: 'enableChat', label: 'Chat Messages', description: 'Push notifications for new messages from senders or travellers.', icon: 'chat', color: '#F59E0B' },
      ],
    },
    {
      title: 'Payments',
      items: [
        { key: 'enablePayments', label: 'Payment & Escrow Alerts', description: 'Escrow locks, payment releases, and refund confirmations.', icon: 'account-balance-wallet', color: '#EF4444', critical: true },
      ],
    },
    {
      title: 'Offers & Promotions',
      items: [
        { key: 'enablePromotions', label: 'Promotional Offers', description: 'Discounts, cashback campaigns, and seasonal deals from CarryGo.', icon: 'local-offer', color: '#EC4899' },
      ],
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.surfaceBorder, paddingTop: insets.top + (Platform.OS === 'ios' ? 0 : Spacing.sm) }]}>
        <Pressable onPress={() => { Haptic.tap(); router.back(); }} hitSlop={12} style={({ pressed }) => [styles.backBtn, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }, pressed && { opacity: 0.7 }]}>
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Notification Preferences</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>Customize which alerts you receive</Text>
        </View>
        {saving ? <ActivityIndicator size="small" color={C.primary} /> : <Ionicons name="notifications" size={22} color={C.primary} />}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[styles.centreText, { color: C.textMuted }]}>Loading preferences…</Text>
        </View>
      ) : error && !prefs ? (
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={40} color={C.error} />
          <Text style={[styles.centreText, { color: C.textSecondary }]}>{error}</Text>
          <Pressable onPress={loadPrefs} style={[styles.retryBtn, { backgroundColor: C.primary }]}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.infoNote, { backgroundColor: C.primarySubtle, borderColor: C.primary + '30' }]}>
            <MaterialIcons name="info-outline" size={15} color={C.primary} />
            <Text style={[styles.infoNoteText, { color: C.textSecondary }]}>
              Critical security and emergency notifications are always delivered, regardless of these settings.
            </Text>
          </View>

          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: C.textMuted }]}>{section.title}</Text>
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
                {section.items.map((item, idx) => {
                  const isEnabled = prefs ? (prefs[item.key] as boolean) : true;
                  const isSaving = saving === item.key;
                  return (
                    <View key={item.key}>
                      {idx > 0 && <View style={[styles.divider, { backgroundColor: C.surfaceBorder + '80' }]} />}
                      <Pressable
                        onPress={() => void toggle(item.key)}
                        style={({ pressed }) => [styles.prefRow, pressed && { backgroundColor: C.primarySubtle }]}
                        disabled={!!saving}
                      >
                        <View style={[styles.prefIcon, { backgroundColor: item.color + '18' }]}>
                          <MaterialIcons name={item.icon} size={18} color={item.color} />
                        </View>
                        <View style={styles.prefTextWrap}>
                          <View style={styles.prefLabelRow}>
                            <Text style={[styles.prefLabel, { color: C.textPrimary }]}>{item.label}</Text>
                            {item.critical && (
                              <View style={[styles.critBadge, { backgroundColor: C.errorSubtle }]}>
                                <Text style={[styles.critBadgeText, { color: C.error }]}>Critical</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.prefDesc, { color: C.textMuted }]} numberOfLines={2}>{item.description}</Text>
                        </View>
                        {isSaving ? (
                          <ActivityIndicator size="small" color={C.primary} />
                        ) : (
                          <Switch
                            value={isEnabled}
                            onValueChange={() => void toggle(item.key)}
                            disabled={!!saving}
                            trackColor={{ false: C.surfaceBorder, true: C.primary + '60' }}
                            thumbColor={isEnabled ? C.primary : C.textMuted}
                            ios_backgroundColor={C.surfaceBorder}
                          />
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          {error && (
            <View style={[styles.errBanner, { backgroundColor: C.errorSubtle, borderColor: C.error + '30' }]}>
              <MaterialIcons name="error" size={14} color={C.error} />
              <Text style={[styles.errText, { color: C.error }]}>{error}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  headerSub: { fontSize: FontSize.xs, marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  centreText: { fontSize: FontSize.sm, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: BorderRadius.md, marginTop: 8 },
  retryText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: 4 },
  infoNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 8 },
  infoNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 2 },
  card: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  prefIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  prefTextWrap: { flex: 1, gap: 2 },
  prefLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prefLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  prefDesc: { fontSize: 11.5, lineHeight: 16 },
  critBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  critBadgeText: { fontSize: 10, fontWeight: FontWeight.bold },
  divider: { height: 1, marginHorizontal: 14 },
  errBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: BorderRadius.md, borderWidth: 1, marginTop: 8 },
  errText: { fontSize: 12, flex: 1 },
});

