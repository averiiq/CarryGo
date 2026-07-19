import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { DarkColors, LightColors, Shadow, LightShadow, Gradients, Motion } from '@/constants/theme';

export function useThemeColors() {
  const { isDark } = useTheme();
  return useMemo(() => ({
    C: isDark ? DarkColors : LightColors,
    S: isDark ? Shadow : LightShadow,
    G: Gradients,
    M: Motion,
    isDark,
  }), [isDark]);
}
