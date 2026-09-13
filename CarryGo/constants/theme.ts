// CarryGo design tokens for a trust-first, calm logistics UI

export type ThemeColors = Omit<typeof DarkColors, 'statusBarStyle'> & {
  statusBarStyle: 'light' | 'dark';
};

// Dark palette (modern dark slate/zinc with crisp contrast)
export const DarkColors = {
  background: '#090D16',
  surface: '#111827',
  surfaceElevated: '#1F2937',
  surfaceHigh: '#374151',
  surfaceBorder: '#1F2937',
  surfaceBorderLight: '#2D3748',

  card: '#111827',
  cardSubtle: '#1F2937',
  cardBorder: '#1F2937',

  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#34D399',
  primarySubtle: 'rgba(16, 185, 129, 0.14)',
  primaryBorder: 'rgba(16, 185, 129, 0.30)',
  primaryGlow: 'rgba(16, 185, 129, 0.32)',

  accent: '#10B981',
  accentSubtle: 'rgba(16, 185, 129, 0.12)',

  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textInverse: '#090D16',

  success: '#10B981',
  successSubtle: 'rgba(16, 185, 129, 0.14)',
  successBorder: 'rgba(16, 185, 129, 0.30)',

  error: '#FB7185',
  errorSubtle: 'rgba(251, 113, 133, 0.16)',
  errorBorder: 'rgba(251, 113, 133, 0.32)',

  warning: '#FBBF24',
  warningSubtle: 'rgba(251, 191, 36, 0.16)',
  warningBorder: 'rgba(251, 191, 36, 0.32)',

  info: '#38BDF8',
  infoSubtle: 'rgba(56, 189, 248, 0.16)',
  infoBorder: 'rgba(56, 189, 248, 0.32)',

  badgeBg: '#1F2937',
  badgeBorder: '#374151',

  locked: '#94A3B8',
  lockedSubtle: 'rgba(148, 163, 184, 0.16)',
  released: '#10B981',
  releasedSubtle: 'rgba(16, 185, 129, 0.14)',

  pending: '#FBBF24',
  accepted: '#10B981',
  rejected: '#FB7185',
  inTransit: '#38BDF8',
  delivered: '#10B981',

  overlay: 'rgba(3, 7, 18, 0.72)',
  overlayLight: 'rgba(3, 7, 18, 0.30)',
  overlayMedium: 'rgba(3, 7, 18, 0.52)',

  tabBarBg: '#0B0F19',
  inputBg: '#1A2332',
  statusBarStyle: 'light' as const,
};

// Light palette (pure, calm, signature CarryGo emerald green)
export const LightColors: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceHigh: '#E2E8F0',
  surfaceBorder: '#E2E8F0',
  surfaceBorderLight: '#F1F5F9',

  card: '#FFFFFF',
  cardSubtle: '#F8FAFC',
  cardBorder: '#E2E8F0',

  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#10B981',
  primarySubtle: '#ECFDF5',
  primaryBorder: '#A7F3D0',
  primaryGlow: 'rgba(5, 150, 105, 0.16)',

  accent: '#059669',
  accentSubtle: '#ECFDF5',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',

  success: '#059669',
  successSubtle: '#ECFDF5',
  successBorder: '#A7F3D0',

  error: '#DC2626',
  errorSubtle: '#FEF2F2',
  errorBorder: '#FECACA',

  warning: '#D97706',
  warningSubtle: '#FFFBEB',
  warningBorder: '#FDE68A',

  info: '#0284C7',
  infoSubtle: '#F0F9FF',
  infoBorder: '#BAE6FD',

  badgeBg: '#F1F5F9',
  badgeBorder: '#E2E8F0',

  locked: '#64748B',
  lockedSubtle: '#F1F5F9',
  released: '#059669',
  releasedSubtle: '#ECFDF5',

  pending: '#D97706',
  accepted: '#059669',
  rejected: '#DC2626',
  inTransit: '#0284C7',
  delivered: '#059669',

  overlay: 'rgba(15, 23, 42, 0.55)',
  overlayLight: 'rgba(15, 23, 42, 0.15)',
  overlayMedium: 'rgba(15, 23, 42, 0.35)',

  tabBarBg: '#FFFFFF',
  inputBg: '#F8FAFC',
  statusBarStyle: 'dark' as const,
};

// Backward-compatible default export
export const Colors = LightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  mdl: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 28,
  xxxl: 34,
  display: 42,
};

export const LetterSpacing = {
  tightest: -0.6,
  tighter: -0.4,
  tight: -0.2,
  normal: 0,
  wide: 0.2,
  wider: 0.5,
  widest: 1.0,
};

export const LineHeight = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 30,
  xxl: 36,
  xxxl: 42,
  display: 48,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 30,
  full: 9999,
};

export const Shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  glow: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 3,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  float: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
};

/**
 * Modern React Native 0.79+ CSS-aligned boxShadow tokens.
 * Provides crisp cross-platform rendering across iOS, Android, and Web.
 */
export const BoxShadow = {
  card: '0px 4px 14px rgba(15, 23, 42, 0.04)',
  glow: '0px 6px 16px rgba(5, 150, 105, 0.16)',
  sm: '0px 2px 6px rgba(15, 23, 42, 0.03)',
  md: '0px 6px 16px rgba(15, 23, 42, 0.06)',
  float: '0px 10px 24px rgba(15, 23, 42, 0.08)',
};

export const LightShadow = {
  ...Shadow,
};

export const Gradients = {
  primary: ['#059669', '#047857'] as [string, string],
  primaryVibrant: ['#10B981', '#059669'] as [string, string],
  accent: ['#10B981', '#059669'] as [string, string],
  hero: ['#FFFFFF', '#F0FDF4', '#F8FAFC'] as [string, string, string],
  card: ['rgba(5, 150, 105, 0.05)', 'rgba(5, 150, 105, 0.0)'] as [string, string],
  emeraldSoft: ['#ECFDF5', '#D1FAE5'] as [string, string],
  success: ['#10B981', '#059669'] as [string, string],
  warm: ['#F59E0B', '#D97706'] as [string, string],
  sky: ['#0EA5E9', '#0284C7'] as [string, string],
  rose: ['#F43F5E', '#E11D48'] as [string, string],
  violet: ['#8B5CF6', '#7C3AED'] as [string, string],
};

export const Motion = {
  springFast: { tension: 380, friction: 28 },
  springDefault: { tension: 180, friction: 20 },
  springBouncy: { tension: 170, friction: 11 },
  springGentle: { tension: 110, friction: 13 },
  pressScale: 0.968,
  cardScale: 0.978,
};

export const TouchTarget = {
  minSize: 44,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  largeHitSlop: { top: 12, bottom: 12, left: 12, right: 12 },
  smallHitSlop: { top: 6, bottom: 6, left: 6, right: 6 },
} as const;

