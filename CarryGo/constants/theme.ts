// CarryGo design tokens for a trust-first, calm logistics UI

export type ThemeColors = Omit<typeof DarkColors, 'statusBarStyle'> & {
  statusBarStyle: 'light' | 'dark';
};

// Dark palette (kept complete for future theme toggle enablement)
export const DarkColors = {
  background: '#0B0F15',
  surface: '#121820',
  surfaceElevated: '#1A222C',
  surfaceHigh: '#222C38',
  surfaceBorder: '#283442',
  surfaceBorderLight: '#354354',

  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  primarySubtle: 'rgba(99, 102, 241, 0.14)',
  primaryGlow: 'rgba(99, 102, 241, 0.30)',

  accent: '#6366F1',
  accentSubtle: 'rgba(99, 102, 241, 0.12)',

  textPrimary: '#F8FAFC',
  textSecondary: '#D1D9E2',
  textMuted: '#94A3B8',
  textInverse: '#0B0F15',

  success: '#10B981',
  successSubtle: 'rgba(16, 185, 129, 0.14)',
  error: '#F87171',
  errorSubtle: 'rgba(248, 113, 113, 0.16)',
  warning: '#F59E0B',
  warningSubtle: 'rgba(245, 158, 11, 0.16)',
  info: '#38BDF8',
  infoSubtle: 'rgba(56, 189, 248, 0.16)',

  locked: '#94A3B8',
  lockedSubtle: 'rgba(148, 163, 184, 0.16)',
  released: '#10B981',
  releasedSubtle: 'rgba(16, 185, 129, 0.14)',

  pending: '#F59E0B',
  accepted: '#6366F1',
  rejected: '#F87171',
  inTransit: '#818CF8',
  delivered: '#10B981',

  overlay: 'rgba(2, 8, 23, 0.68)',
  overlayLight: 'rgba(2, 8, 23, 0.28)',
  overlayMedium: 'rgba(2, 8, 23, 0.48)',

  tabBarBg: '#0E131A',
  inputBg: '#1A222C',
  statusBarStyle: 'light' as const,
};

// Light palette (pure, calm, minimalist modern electric indigo)
export const LightColors: ThemeColors = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceElevated: '#F3F4F6',
  surfaceHigh: '#E5E7EB',
  surfaceBorder: '#E5E7EB',
  surfaceBorderLight: '#F3F4F6',

  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primaryLight: '#6366F1',
  primarySubtle: '#EEF2FF',
  primaryGlow: 'rgba(79, 70, 229, 0.18)',

  accent: '#4F46E5',
  accentSubtle: '#EEF2FF',

  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',

  success: '#10B981',
  successSubtle: '#ECFDF5',
  error: '#EF4444',
  errorSubtle: '#FEF2F2',
  warning: '#F59E0B',
  warningSubtle: '#FFFBEB',
  info: '#0EA5E9',
  infoSubtle: '#F0F9FF',

  locked: '#6B7280',
  lockedSubtle: 'rgba(107, 114, 128, 0.12)',
  released: '#10B981',
  releasedSubtle: '#ECFDF5',

  pending: '#F59E0B',
  accepted: '#4F46E5',
  rejected: '#EF4444',
  inTransit: '#6366F1',
  delivered: '#10B981',

  overlay: 'rgba(17, 24, 39, 0.52)',
  overlayLight: 'rgba(17, 24, 39, 0.12)',
  overlayMedium: 'rgba(17, 24, 39, 0.28)',

  tabBarBg: '#FFFFFF',
  inputBg: '#F9FAFB',
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
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  glow: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  float: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
};

/**
 * Modern React Native 0.79+ CSS-aligned boxShadow tokens.
 * Provides crisp cross-platform rendering across iOS, Android, and Web.
 */
export const BoxShadow = {
  card: '0px 4px 12px rgba(15, 23, 42, 0.05)',
  glow: '0px 6px 16px rgba(79, 70, 229, 0.18)',
  sm: '0px 2px 6px rgba(15, 23, 42, 0.04)',
  float: '0px 8px 20px rgba(15, 23, 42, 0.08)',
};

export const LightShadow = {
  ...Shadow,
};

export const Gradients = {
  primary: ['#4F46E5', '#3730A3'] as [string, string],
  primaryVibrant: ['#6366F1', '#4338CA'] as [string, string],
  accent: ['#4F46E5', '#2563EB'] as [string, string],
  hero: ['#FFFFFF', '#F5F7FF', '#F9FAFB'] as [string, string, string],
  card: ['rgba(79, 70, 229, 0.05)', 'rgba(79, 70, 229, 0.0)'] as [string, string],
  success: ['#34D399', '#10B981'] as [string, string],
  warm: ['#FBBF24', '#D97706'] as [string, string],
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

