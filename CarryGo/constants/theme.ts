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

// Light palette (current production theme)
export const LightColors: ThemeColors = {
  background: '#F4F8F1',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FBF6',
  surfaceHigh: '#F1F6EC',
  surfaceBorder: '#DFE8D8',
  surfaceBorderLight: '#EAF1E3',

  primary: '#58B86F',
  primaryDark: '#2D8A45',
  primaryLight: '#82D198',
  primarySubtle: 'rgba(88, 184, 111, 0.14)',
  primaryGlow: 'rgba(88, 184, 111, 0.26)',

  accent: '#4D9BFF',
  accentSubtle: 'rgba(77, 155, 255, 0.14)',

  textPrimary: '#131A1E',
  textSecondary: '#334155',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',

  success: '#2F9E44',
  successSubtle: 'rgba(47, 158, 68, 0.14)',
  error: '#E74C3C',
  errorSubtle: 'rgba(231, 76, 60, 0.14)',
  warning: '#E3A008',
  warningSubtle: 'rgba(227, 160, 8, 0.14)',
  info: '#3B82F6',
  infoSubtle: 'rgba(59, 130, 246, 0.14)',

  locked: '#64748B',
  lockedSubtle: 'rgba(100, 116, 139, 0.14)',
  released: '#2F9E44',
  releasedSubtle: 'rgba(47, 158, 68, 0.14)',

  pending: '#E3A008',
  accepted: '#2F9E44',
  rejected: '#E74C3C',
  inTransit: '#3B82F6',
  delivered: '#2F9E44',

  overlay: 'rgba(15, 23, 42, 0.58)',
  overlayLight: 'rgba(15, 23, 42, 0.2)',
  overlayMedium: 'rgba(15, 23, 42, 0.36)',

  tabBarBg: '#FFFFFF',
  inputBg: '#F7FAF5',
  statusBarStyle: 'dark' as const,
};

// Backward-compatible default export
export const Colors = LightColors;

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
  lg: 18,
  xl: 22,
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
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
  full: 9999,
};

export const Shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  glow: {
    shadowColor: '#58B86F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 7,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  float: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const LightShadow = {
  ...Shadow,
};

export const Gradients = {
  primary: ['#7CDB91', '#58B86F'] as [string, string],
  primaryVibrant: ['#7CD98F', '#3EA25A'] as [string, string],
  accent: ['#8CC8FF', '#5AA8FF'] as [string, string],
  hero: ['#F8FCF5', '#F2F8EE', '#ECF4E7'] as [string, string, string],
  card: ['rgba(88,184,111,0.09)', 'rgba(88,184,111,0.0)'] as [string, string],
  success: ['#63CC7A', '#2F9E44'] as [string, string],
  warm: ['#FFD98A', '#F4AF2F'] as [string, string],
};

export const Motion = {
  springFast: { tension: 380, friction: 28 },
  springDefault: { tension: 180, friction: 20 },
  springBouncy: { tension: 170, friction: 11 },
  springGentle: { tension: 110, friction: 13 },
  pressScale: 0.968,
  cardScale: 0.978,
};
