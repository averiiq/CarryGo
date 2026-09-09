import { useWindowDimensions } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { useResponsive, TouchTarget } from '../../hooks/useResponsive';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  useWindowDimensions: jest.fn(),
}));

describe('useResponsive and TouchTarget', () => {
  it('exports accessible TouchTarget constants', () => {
    expect(TouchTarget.minSize).toBe(44);
    expect(TouchTarget.hitSlop).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });
    expect(TouchTarget.smallHitSlop).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
  });

  it('correctly calculates small device flags and thresholds (e.g. 360px)', () => {
    (useWindowDimensions as jest.Mock).mockReturnValue({
      width: 360,
      height: 740,
      scale: 2,
      fontScale: 1,
    });

    const { result } = renderHook(() => useResponsive());
    expect(result.current.isSmallDevice).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.tabBarHorizontalMargin).toBe(12);
    expect(result.current.contentMaxWidth).toBe('100%');
    expect(result.current.swipeThreshold).toBeGreaterThanOrEqual(65);
    expect(result.current.swipeThreshold).toBeLessThanOrEqual(95);
  });

  it('correctly calculates tablet flags and max widths (e.g. 768px)', () => {
    (useWindowDimensions as jest.Mock).mockReturnValue({
      width: 768,
      height: 1024,
      scale: 2,
      fontScale: 1,
    });

    const { result } = renderHook(() => useResponsive());
    expect(result.current.isSmallDevice).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.tabBarMaxWidth).toBe(520);
    expect(result.current.contentMaxWidth).toBe(620);
    expect(result.current.tabletContainerStyle).toEqual({
      maxWidth: 620,
      width: '100%',
      alignSelf: 'center',
    });
  });
});
