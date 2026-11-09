import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import {
  TERMS_CONTENT,
  BACK_BUTTON_LABEL,
} from '@/constants/legal-bilingual-content';
import {
  LanguageToggle,
  DraftLegalBanner,
  useLegalLanguage,
} from '@/components/ui/LanguageToggle';

export default function TermsScreen() {
  const { C } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, setLanguage } = useLegalLanguage();

  const content = TERMS_CONTENT[language];

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Header */}
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
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <DraftLegalBanner language={language} />

        {/* Preamble */}
        <View style={[styles.badge, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name="gavel" size={16} color={C.primary} />
          <Text style={[styles.badgeText, { color: C.primary }]}>{content.effectiveDate}</Text>
        </View>

        <Text style={[styles.bodyText, { color: C.textSecondary }]}>
          {content.preamble}
        </Text>

        {/* Dynamic Sections 1 through 20 */}
        {content.sections.map((section) => (
          <Section key={section.number} number={section.number} title={section.title} C={C}>
            {section.paragraphs.map((p, idx) => (
              <Paragraph key={idx} C={C}>
                {p}
              </Paragraph>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <BulletList C={C} items={section.bullets} />
            )}
            {section.postBullets && section.postBullets.map((p, idx) => (
              <Paragraph key={`post-${idx}`} C={C}>
                {p}
              </Paragraph>
            ))}
          </Section>
        ))}

        <View style={[styles.finalNote, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <MaterialIcons name="info-outline" size={16} color={C.textMuted} />
          <Text style={[styles.finalNoteText, { color: C.textMuted }]}>
            {content.finalNote}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Sub-Components ─── */

function Section({ number, title, children, C }: {
  number: string;
  title: string;
  children: React.ReactNode;
  C: any;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionBadge, { backgroundColor: C.primarySubtle }]}>
          <Text style={[styles.sectionBadgeText, { color: C.primary }]}>{number}</Text>
        </View>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Paragraph({ children, C }: { children: React.ReactNode; C: any }) {
  return (
    <Text style={[styles.paragraph, { color: C.textSecondary }]}>{children}</Text>
  );
}

function BulletList({ items, C }: { items: string[]; C: any }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletItem}>
          <View style={[styles.bulletDot, { backgroundColor: C.primary }]} />
          <Text style={[styles.bulletItemText, { color: C.textSecondary }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  bodyText: {
    fontSize: FontSize.md,
    lineHeight: 24,
  },
  section: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionBadge: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    flex: 1,
  },
  paragraph: {
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  bulletList: {
    gap: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  bulletItemText: {
    fontSize: FontSize.sm,
    lineHeight: 22,
    flex: 1,
  },
  finalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  finalNoteText: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    flex: 1,
  },
});
