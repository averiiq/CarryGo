import React, { useEffect, useState, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import {
  LegalLanguage,
  LEGAL_LANGUAGE_STORAGE_KEY,
  DRAFT_DISCLAIMER,
} from '@/constants/legal-bilingual-content';
import { storageGet, storageSet } from '@/lib/secure-storage';

/**
 * Hook to manage language selection for legal screens.
 * - Defaults unconditionally to 'en'.
 * - Persists choice non-sensitively via existing storageGet/storageSet.
 */
export function useLegalLanguage() {
  const [language, setLanguageState] = useState<LegalLanguage>('en');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const saved = await storageGet<string>(LEGAL_LANGUAGE_STORAGE_KEY);
        if (isMounted && (saved === 'en' || saved === 'hi')) {
          setLanguageState(saved);
        }
      } catch {
        // Fallback silently to English default
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = useCallback((newLang: LegalLanguage) => {
    setLanguageState(newLang);
    storageSet(LEGAL_LANGUAGE_STORAGE_KEY, newLang).catch(() => {});
  }, []);

  return { language, setLanguage };
}

interface LanguageToggleProps {
  currentLanguage: LegalLanguage;
  onLanguageChange: (lang: LegalLanguage) => void;
}

/**
 * Minimal segmented pill language toggle (EN | HI).
 */
export function LanguageToggle({ currentLanguage, onLanguageChange }: LanguageToggleProps) {
  const { C } = useThemeColors();

  const handleSelect = (lang: LegalLanguage) => {
    if (lang === currentLanguage) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics unavailable on web/unsupported devices
    }
    onLanguageChange(lang);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: C.surfaceElevated,
          borderColor: C.surfaceBorder,
        },
      ]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Language selection"
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel="English"
        accessibilityState={{ selected: currentLanguage === 'en' }}
        onPress={() => handleSelect('en')}
        style={[
          styles.pill,
          currentLanguage === 'en' && [styles.pillActive, { backgroundColor: C.primary }],
        ]}
        hitSlop={4}
      >
        <Text
          style={[
            styles.pillText,
            { color: currentLanguage === 'en' ? '#FFFFFF' : C.textSecondary },
          ]}
        >
          EN
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="radio"
        accessibilityLabel="Hindi"
        accessibilityState={{ selected: currentLanguage === 'hi' }}
        onPress={() => handleSelect('hi')}
        style={[
          styles.pill,
          currentLanguage === 'hi' && [styles.pillActive, { backgroundColor: C.primary }],
        ]}
        hitSlop={4}
      >
        <Text
          style={[
            styles.pillText,
            { color: currentLanguage === 'hi' ? '#FFFFFF' : C.textSecondary },
          ]}
        >
          HI
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Notice banner displayed whenever Hindi translation is selected,
 * explicitly flagging it as a convenience draft while English remains
 * the legally binding text.
 */
export function DraftLegalBanner({ language }: { language: LegalLanguage }) {
  const { C } = useThemeColors();

  if (language !== 'hi') {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: C.primarySubtle,
          borderColor: C.primary,
        },
      ]}
      accessibilityRole="alert"
    >
      <MaterialIcons name="info" size={18} color={C.primary} style={styles.bannerIcon} />
      <View style={styles.bannerContent}>
        <Text style={[styles.bannerHeader, { color: C.primary }]}>
          प्रारूप अनुवाद सूचना (Draft Translation Notice)
        </Text>
        <Text style={[styles.bannerText, { color: C.textPrimary }]}>
          {DRAFT_DISCLAIMER.hi}
        </Text>
        <Text style={[styles.bannerSubtext, { color: C.textSecondary }]}>
          {DRAFT_DISCLAIMER.en}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  pillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginVertical: Spacing.xs,
  },
  bannerIcon: {
    marginTop: 2,
  },
  bannerContent: {
    flex: 1,
    gap: 2,
  },
  bannerHeader: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  bannerText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    lineHeight: 18,
  },
  bannerSubtext: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
