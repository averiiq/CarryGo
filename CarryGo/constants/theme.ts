import { Platform } from 'react-native';

// CarryGo design tokens for a trust-first, calm logistics UI

// Light palette (Modern Royal Electric Blue brand palette)
export const LightColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceHigh: '#E2E8F0',
  surfaceBorder: '#E2E8F0',
  surfaceBorderLight: '#F1F5F9',

  card: '#FFFFFF',
  cardSubtle: '#F8FAFC',
  cardBorder: '#E2E8F0',

  // Modern Royal Electric Blue Primary Brand Palette
  primary: '#1A4CA2',
  primaryDark: '#123777',
  primaryLight: '#2565CE',
  primarySubtle: '#EEF4FF',
  primaryBorder: '#BFD5FA',
  primaryGlow: 'rgba(26, 76, 162, 0.16)',

  // Clean Accent Palette
  accent: '#1A4CA2',
  accentDark: '#123777',
  accentLight: '#2D72E2',
  accentSubtle: '#EEF4FF',
  accentBorder: '#BFD5FA',
  accentText: '#FFFFFF',

  // Named helpers for backwards compatibility
  cobalt: '#1A4CA2',
  cobaltDark: '#123777',
  cobaltLight: '#2D72E2',
  cobaltSubtle: '#EEF4FF',
  cobaltBorder: '#BFD5FA',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',
  textWhite: '#FFFFFF',

  success: '#10B981',
  successSubtle: '#ECFDF5',
  successBorder: '#A7F3D0',

  error: '#EF4444',
  errorSubtle: '#FEF2F2',
  errorBorder: '#FECACA',

  warning: '#F59E0B',
  warningSubtle: '#FFFBEB',
  warningBorder: '#FDE68A',

  info: '#0284C7',
  infoSubtle: '#F0F9FF',
  infoBorder: '#BAE6FD',

  badgeBg: '#F1F5F9',
  badgeBorder: '#E2E8F0',

  locked: '#64748B',
  lockedSubtle: '#F1F5F9',
  released: '#10B981',
  releasedSubtle: '#ECFDF5',

  pending: '#F59E0B',
  accepted: '#1A4CA2',
  rejected: '#EF4444',
  inTransit: '#0284C7',
  delivered: '#10B981',

  overlay: 'rgba(15, 23, 42, 0.55)',
  overlayLight: 'rgba(15, 23, 42, 0.15)',
  overlayMedium: 'rgba(15, 23, 42, 0.35)',

  tabBarBg: '#FFFFFF',
  inputBg: '#F8FAFC',
  statusBarStyle: 'dark' as const,
};

export type ThemeColors = typeof LightColors;

// Backward-compatible aliases
export const DarkColors = LightColors;
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
    shadowColor: '#1A4CA2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
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
  glow: '0px 6px 16px rgba(26, 76, 162, 0.16)',
  sm: '0px 2px 6px rgba(15, 23, 42, 0.03)',
  md: '0px 6px 16px rgba(15, 23, 42, 0.06)',
  float: '0px 10px 24px rgba(15, 23, 42, 0.08)',
};

export const LightShadow = {
  ...Shadow,
};

export const Gradients = {
  primary: ['#1A4CA2', '#123777'] as [string, string],
  primaryVibrant: ['#2565CE', '#1A4CA2'] as [string, string],
  accent: ['#1A4CA2', '#123777'] as [string, string],
  lime: ['#2565CE', '#1A4CA2'] as [string, string],
  cobalt: ['#1A4CA2', '#123777'] as [string, string],
  hero: ['#FFFFFF', '#EEF4FF', '#F8FAFC'] as [string, string, string],
  card: ['rgba(26, 76, 162, 0.04)', 'rgba(26, 76, 162, 0.0)'] as [string, string],
  cobaltSoft: ['#EEF4FF', '#DBE8FD'] as [string, string],
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

/**
 * Tab bar layout and geometry calculations.
 * Ensures pixel-perfect alignment, safe area offsets, and content clearance
 * across all screen sizes (small phones, Android 3-button nav, iPhones, foldables, tablets).
 */
export const TabBarGeometry = {
  getHeight: (isSmallDevice = false, isTablet = false): number => {
    return isSmallDevice ? 56 : isTablet ? 66 : 62;
  },
  getBottomOffset: (insetsBottom: number, isSmallDevice = false): number => {
    if (insetsBottom > 36) {
      // Android 3-button software navigation bar (typically ~48px inset)
      return insetsBottom + 4;
    }
    if (insetsBottom > 0) {
      // Modern iOS home indicator (~34px) or Android gesture navigation pill (~16-24px)
      return insetsBottom + (isSmallDevice ? 2 : 4);
    }
    // Devices with no bottom inset (e.g. flat screens, hardware buttons)
    return isSmallDevice ? 10 : 14;
  },
  getClearance: (insetsBottom: number, isSmallDevice = false, isTablet = false, extraBreathing = 16): number => {
    const height = TabBarGeometry.getHeight(isSmallDevice, isTablet);
    const bottomOffset = TabBarGeometry.getBottomOffset(insetsBottom, isSmallDevice);
    return height + bottomOffset + extraBreathing;
  },
  getFabBottom: (insetsBottom: number, isSmallDevice = false, isTablet = false, marginAboveBar = 12): number => {
    const height = TabBarGeometry.getHeight(isSmallDevice, isTablet);
    const bottomOffset = TabBarGeometry.getBottomOffset(insetsBottom, isSmallDevice);
    return height + bottomOffset + marginAboveBar;
  },
};

/**
 * Status bar layout and top inset calculations.
 * Ensures notch, dynamic island, and punch-hole cameras never overlap headers,
 * while preventing awkward excessive padding on flat/small devices.
 */
export const StatusBarGeometry = {
  getTopInset: (insetsTop: number): number => {
    // Guarantees safe top clearance on Android (status bar min 24px) or iOS / web
    return Math.max(insetsTop, Platform.OS === 'android' ? 24 : 0);
  },
  getHeaderPaddingTop: (insetsTop: number, extra = 8): number => {
    return StatusBarGeometry.getTopInset(insetsTop) + extra;
  },
};


