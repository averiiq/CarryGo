import { useMemo } from 'react';
import { LightColors, LightShadow, Gradients, Motion } from '@/constants/theme';

export function useThemeColors() {
  return useMemo(() => ({
    C: LightColors,
    S: LightShadow,
    G: Gradients,
    M: Motion,
    isDark: false,
  }), []);
}
