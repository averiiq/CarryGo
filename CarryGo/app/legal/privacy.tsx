import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import {
  PRIVACY_CONTENT,
  BACK_BUTTON_LABEL,
} from '@/constants/legal-bilingual-content';
import {
  LanguageToggle,
  DraftLegalBanner,
  useLegalLanguage,
} from '@/components/ui/LanguageToggle';

export default function PrivacyScreen() {
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, setLanguage } = useLegalLanguage();

  const content = PRIVACY_CONTENT[language];

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: C.surfaceBorder }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={BACK_BUTTON_LABEL[language]}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: C.surfaceElevated }]}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]} numberOfLines={1}>
          {content.headerTitle}
        </Text>
        <LanguageToggle currentLanguage={language} onLanguageChange={setLanguage} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <DraftLegalBanner language={language} />

        <View style={[styles.badge, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="privacy-tip" size={16} color={C.primary} />
          <Text style={[styles.badgeText, { color: C.primary }]}>{content.effectiveDate}</Text>
        </View>

        <Text style={[styles.intro, { color: C.textSecondary }]}>
          {content.intro}
        </Text>

        {content.sections.map((section, index) => (
          <View key={index} style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
            <Text style={[styles.number, { color: C.primary }]}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.cardContent}>
              <Text style={[styles.title, { color: C.textPrimary }]}>{section.title}</Text>
              <Text style={[styles.body, { color: C.textSecondary }]}>{section.body}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.contact, { color: C.textMuted }]}>
          {content.contact}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backButton: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
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
