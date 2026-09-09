import { useWindowDimensions } from 'react-native';

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export const TouchTarget = {
  minSize: 44,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  largeHitSlop: { top: 12, bottom: 12, left: 12, right: 12 },
  smallHitSlop: { top: 6, bottom: 6, left: 6, right: 6 },
} as const;

export function useResponsive() {
  const { width, height, scale: pixelRatio, fontScale } = useWindowDimensions();

  const isSmallDevice = width < 380;
  const isMediumDevice = width >= 380 && width < 440;
  const isLargeDevice = width >= 440 && width < 600;
  const isTablet = width >= 600;
  const isLandscape = width > height;

  // Clamped moderate scaling based on screen width
  const scale = (size: number): number => {
    const ratio = width / BASE_WIDTH;
    // Clamp ratio between 0.85 (small phones) and 1.25 (tablets)
    const clampedRatio = Math.max(0.85, Math.min(ratio, 1.25));
    return Math.round(size * clampedRatio);
  };

  const moderateScale = (size: number, factor = 0.5): number => {
    const ratio = width / BASE_WIDTH;
    const clampedRatio = Math.max(0.85, Math.min(ratio, 1.25));
    return Math.round(size + (size * clampedRatio - size) * factor);
  };

  // Content max-width for tablet centering to avoid awkwardly stretched cards
  const contentMaxWidth = isTablet ? 620 : '100%';

  // Tablet card container style
  const tabletContainerStyle = isTablet
    ? { maxWidth: 620, width: '100%' as const, alignSelf: 'center' as const }
    : undefined;

  // Floating tab capsule layout parameters
  const tabBarHorizontalMargin = isSmallDevice ? 12 : isTablet ? 0 : 18;
  const tabBarMaxWidth = isTablet ? 520 : undefined;

  // Standard swipe gesture threshold for cards
  const swipeThreshold = Math.min(95, Math.max(65, Math.round(width * 0.22)));

  return {
    width,
    height,
    pixelRatio,
    fontScale,
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
    isTablet,
    isLandscape,
    scale,
    moderateScale,
    contentMaxWidth,
    tabletContainerStyle,
    tabBarHorizontalMargin,
    tabBarMaxWidth,
    swipeThreshold,
    TouchTarget,
  };
}
