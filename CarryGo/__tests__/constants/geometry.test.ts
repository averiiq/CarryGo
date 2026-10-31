import { Platform } from 'react-native';
import { TabBarGeometry, StatusBarGeometry } from '@/constants/theme';

describe('TabBarGeometry & StatusBarGeometry cross-device calculations', () => {
  describe('TabBarGeometry.getHeight', () => {
    it('returns 56 for small devices', () => {
      expect(TabBarGeometry.getHeight(true, false)).toBe(56);
    });

    it('returns 66 for tablets', () => {
      expect(TabBarGeometry.getHeight(false, true)).toBe(66);
    });

    it('returns 62 for standard modern devices', () => {
      expect(TabBarGeometry.getHeight(false, false)).toBe(62);
    });
  });

  describe('TabBarGeometry.getBottomOffset', () => {
    it('handles Android 3-button navigation bar (> 36px insets)', () => {
      // Typically 48px on standard Android software nav bar
      expect(TabBarGeometry.getBottomOffset(48, false)).toBe(52);
    });

    it('handles modern iOS home indicator (~34px insets)', () => {
      expect(TabBarGeometry.getBottomOffset(34, false)).toBe(38);
      expect(TabBarGeometry.getBottomOffset(34, true)).toBe(36);
    });

    it('handles Android gesture pill (~20px insets)', () => {
      expect(TabBarGeometry.getBottomOffset(20, false)).toBe(24);
    });

    it('handles flat devices with 0 bottom inset', () => {
      expect(TabBarGeometry.getBottomOffset(0, false)).toBe(14);
      expect(TabBarGeometry.getBottomOffset(0, true)).toBe(10);
    });
  });

  describe('TabBarGeometry.getClearance', () => {
    it('provides safe clearance for iOS with home indicator', () => {
      // height(62) + offset(38) + breathing(16) = 116
      expect(TabBarGeometry.getClearance(34, false, false)).toBe(116);
    });

    it('provides safe clearance for Android 3-button navigation', () => {
      // height(62) + offset(52) + breathing(16) = 130
      expect(TabBarGeometry.getClearance(48, false, false)).toBe(130);
    });

    it('provides safe clearance for small device with zero inset', () => {
      // height(56) + offset(10) + breathing(16) = 82
      expect(TabBarGeometry.getClearance(0, true, false)).toBe(82);
    });

    it('provides safe clearance for tablet', () => {
      // height(66) + offset(28) + breathing(16) = 110
      expect(TabBarGeometry.getClearance(24, false, true)).toBe(110);
    });
  });

  describe('TabBarGeometry.getFabBottom', () => {
    it('floats exactly above the tab capsule on all form factors', () => {
      // iOS: height(62) + offset(38) + fabMargin(12) = 112
      expect(TabBarGeometry.getFabBottom(34, false, false)).toBe(112);

      // Android 3-button: height(62) + offset(52) + fabMargin(12) = 126
      expect(TabBarGeometry.getFabBottom(48, false, false)).toBe(126);

      // Small device zero inset: height(56) + offset(10) + fabMargin(12) = 78
      expect(TabBarGeometry.getFabBottom(0, true, false)).toBe(78);
    });
  });

  describe('StatusBarGeometry', () => {
    it('returns status bar top inset respecting platform minimums', () => {
      if (Platform.OS === 'android') {
        expect(StatusBarGeometry.getTopInset(0)).toBe(24);
        expect(StatusBarGeometry.getTopInset(36)).toBe(36);
      } else {
        expect(StatusBarGeometry.getTopInset(0)).toBe(0);
        expect(StatusBarGeometry.getTopInset(47)).toBe(47);
        expect(StatusBarGeometry.getTopInset(59)).toBe(59);
      }
    });

    it('computes header padding top with extra padding', () => {
      const top = StatusBarGeometry.getTopInset(47);
      expect(StatusBarGeometry.getHeaderPaddingTop(47, 8)).toBe(top + 8);
    });
  });
});

