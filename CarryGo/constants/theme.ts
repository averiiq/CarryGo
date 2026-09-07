// CarryGo design tokens for a trust-first, calm logistics UI

export type ThemeColors = Omit<typeof DarkColors, 'statusBarStyle'> & {
  statusBarStyle: 'light' | 'dark';
};

// Dark palette (kept complete for future theme toggle enablement)
export const DarkColors = {
  background: '#0F141B',
  surface: '#161D27',
  surfaceElevated: '#1C2430',
  surfaceHigh: '#232C39',
  surfaceBorder: '#2F3A48',
  surfaceBorderLight: '#3C495A',

  primary: '#79E38C',
  primaryDark: '#42C45A',
  primaryLight: '#9EF2AE',
  primarySubtle: 'rgba(121, 227, 140, 0.14)',
  primaryGlow: 'rgba(121, 227, 140, 0.28)',

  accent: '#7AC5FF',
  accentSubtle: 'rgba(122, 197, 255, 0.16)',

  textPrimary: '#F8FAFC',
  textSecondary: '#D1D9E2',
  textMuted: '#94A3B8',
  textInverse: '#0F141B',

  success: '#4ADE80',
  successSubtle: 'rgba(74, 222, 128, 0.14)',
  error: '#F87171',
  errorSubtle: 'rgba(248, 113, 113, 0.16)',
  warning: '#F59E0B',
  warningSubtle: 'rgba(245, 158, 11, 0.16)',
  info: '#60A5FA',
  infoSubtle: 'rgba(96, 165, 250, 0.16)',

  locked: '#94A3B8',
  lockedSubtle: 'rgba(148, 163, 184, 0.16)',
  released: '#4ADE80',
  releasedSubtle: 'rgba(74, 222, 128, 0.14)',

  pending: '#F59E0B',
  accepted: '#4ADE80',
  rejected: '#F87171',
  inTransit: '#60A5FA',
  delivered: '#4ADE80',

  overlay: 'rgba(2, 8, 23, 0.68)',
  overlayLight: 'rgba(2, 8, 23, 0.28)',
  overlayMedium: 'rgba(2, 8, 23, 0.48)',

  tabBarBg: '#0F141B',
  inputBg: '#1C2430',
  statusBarStyle: 'light' as const,
};

// Light palette (pure, calm, world-class light theme)
export const LightColors: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceHigh: '#E2E8F0',
  surfaceBorder: '#E2E8F0',
  surfaceBorderLight: '#F1F5F9',

  primary: '#059669',
  primaryDark: '#064E3B',
  primaryLight: '#34D399',
  primarySubtle: '#ECFDF5',
  primaryGlow: 'rgba(5, 150, 105, 0.20)',

  accent: '#2563EB',
  accentSubtle: '#EFF6FF',

  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',

  success: '#10B981',
  successSubtle: '#ECFDF5',
  error: '#EF4444',
  errorSubtle: '#FEF2F2',
  warning: '#F59E0B',
  warningSubtle: '#FFFBEB',
  info: '#3B82F6',
  infoSubtle: '#EFF6FF',

  locked: '#64748B',
  lockedSubtle: 'rgba(100, 116, 139, 0.12)',
  released: '#10B981',
  releasedSubtle: '#ECFDF5',

  pending: '#F59E0B',
  accepted: '#10B981',
  rejected: '#EF4444',
  inTransit: '#3B82F6',
  delivered: '#10B981',

  overlay: 'rgba(15, 23, 42, 0.52)',
  overlayLight: 'rgba(15, 23, 42, 0.12)',
  overlayMedium: 'rgba(15, 23, 42, 0.28)',

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
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
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
  glow: '0px 6px 14px rgba(5, 150, 105, 0.14)',
  sm: '0px 2px 6px rgba(15, 23, 42, 0.04)',
  float: '0px 8px 20px rgba(15, 23, 42, 0.08)',
};

export const LightShadow = {
  ...Shadow,
};

export const Gradients = {
  primary: ['#059669', '#064E3B'] as [string, string],
  primaryVibrant: ['#10B981', '#047857'] as [string, string],
  accent: ['#3B82F6', '#1D4ED8'] as [string, string],
  hero: ['#FFFFFF', '#F8FAFC', '#F1F5F9'] as [string, string, string],
  card: ['rgba(5, 150, 105, 0.06)', 'rgba(5, 150, 105, 0.0)'] as [string, string],
  success: ['#34D399', '#059669'] as [string, string],
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
