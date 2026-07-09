// CarryGo Design System — Dual Theme with Motion & Gradients

export type ThemeColors = Omit<typeof DarkColors, 'statusBarStyle'> & {
  statusBarStyle: 'light' | 'dark';
};

export const DarkColors = {
  background: '#050510',
  surface: '#0C0C1D',
  surfaceElevated: '#141428',
  surfaceHigh: '#1C1C35',
  surfaceBorder: '#1F1F3A',
  surfaceBorderLight: '#2A2A4A',

  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryLight: '#A78BFA',
  primarySubtle: 'rgba(124,58,237,0.12)',
  primaryGlow: 'rgba(124,58,237,0.32)',

  accent: '#06B6D4',
  accentSubtle: 'rgba(6,182,212,0.12)',

  textPrimary: '#F4F4F8',
  textSecondary: '#A0A0BE',
  textMuted: '#5A5A78',
  textInverse: '#FFFFFF',

  success: '#10B981',
  successSubtle: 'rgba(16,185,129,0.12)',
  error: '#EF4444',
  errorSubtle: 'rgba(239,68,68,0.12)',
  warning: '#F59E0B',
  warningSubtle: 'rgba(245,158,11,0.12)',
  info: '#06B6D4',
  infoSubtle: 'rgba(6,182,212,0.12)',

  locked: '#F59E0B',
  lockedSubtle: 'rgba(245,158,11,0.12)',
  released: '#10B981',
  releasedSubtle: 'rgba(16,185,129,0.12)',

  pending: '#F59E0B',
  accepted: '#10B981',
  rejected: '#EF4444',
  inTransit: '#3B82F6',
  delivered: '#10B981',

  overlay: 'rgba(0,0,0,0.88)',
  overlayLight: 'rgba(0,0,0,0.45)',
  overlayMedium: 'rgba(0,0,0,0.7)',

  tabBarBg: '#080814',
  inputBg: '#141428',
  statusBarStyle: 'light' as const,
};

export const LightColors: ThemeColors = {
  background: '#F8F9FC',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F1F8',
  surfaceHigh: '#E8E9F4',
  surfaceBorder: '#E2E4F0',
  surfaceBorderLight: '#D0D3E8',

  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryLight: '#A78BFA',
  primarySubtle: 'rgba(124,58,237,0.08)',
  primaryGlow: 'rgba(124,58,237,0.18)',

  accent: '#0891B2',
  accentSubtle: 'rgba(8,145,178,0.08)',

  textPrimary: '#0F1219',
  textSecondary: '#3F4559',
  textMuted: '#8890A8',
  textInverse: '#FFFFFF',

  success: '#059669',
  successSubtle: 'rgba(5,150,105,0.08)',
  error: '#DC2626',
  errorSubtle: 'rgba(220,38,38,0.08)',
  warning: '#D97706',
  warningSubtle: 'rgba(217,119,6,0.08)',
  info: '#0891B2',
  infoSubtle: 'rgba(8,145,178,0.08)',

  locked: '#D97706',
  lockedSubtle: 'rgba(217,119,6,0.1)',
  released: '#059669',
  releasedSubtle: 'rgba(5,150,105,0.1)',

  pending: '#D97706',
  accepted: '#059669',
  rejected: '#DC2626',
  inTransit: '#7C3AED',
  delivered: '#059669',

  overlay: 'rgba(15,18,25,0.55)',
  overlayLight: 'rgba(15,18,25,0.18)',
  overlayMedium: 'rgba(15,18,25,0.42)',

  tabBarBg: '#FFFFFF',
  inputBg: '#F0F1F8',
  statusBarStyle: 'dark' as const,
};

// Default export for backward compatibility (dark theme)
export const Colors = DarkColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 32,
  display: 40,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  xxl: 34,
  full: 9999,
};

export const Shadow = {
  card: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  glow: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 14,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  float: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 16,
  },
};

export const LightShadow = {
  card: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 8,
  },
  glow: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 8,
  },
  sm: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  float: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const Gradients = {
  primary: ['#7C3AED', '#6D28D9'] as [string, string],
  primaryVibrant: ['#8B5CF6', '#6D28D9'] as [string, string],
  accent: ['#06B6D4', '#0891B2'] as [string, string],
  hero: ['#7C3AED', '#4F46E5', '#06B6D4'] as [string, string, string],
  card: ['rgba(124,58,237,0.08)', 'transparent'] as [string, string],
  success: ['#10B981', '#059669'] as [string, string],
  warm: ['#F59E0B', '#D97706'] as [string, string],
};

export const Motion = {
  springFast: { tension: 400, friction: 30 },
  springDefault: { tension: 200, friction: 22 },
  springBouncy: { tension: 180, friction: 12 },
  springGentle: { tension: 120, friction: 14 },
  pressScale: 0.965,
  cardScale: 0.975,
};
