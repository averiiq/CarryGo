import { useState, useEffect } from 'react';
import { Keyboard, Platform, KeyboardEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '@/constants/theme';

interface UseKeyboardPaddingOptions {
  activePadding?: number;
  inactivePadding?: number;
}

export function useKeyboardPadding(options?: UseKeyboardPaddingOptions) {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const activePadding = options?.activePadding ?? Spacing.xs;
  const inactivePadding = options?.inactivePadding ?? Spacing.sm;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    };

    const onHide = () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // When keyboard is visible, safe area bottom inset is effectively superseded by the keyboard.
  // We supply a comfortable, snug padding above the keyboard (activePadding).
  // When keyboard is closed, we preserve the system home indicator inset + inactivePadding.
  const bottomInset = isKeyboardVisible
    ? activePadding
    : Math.max(insets.bottom, Spacing.xs) + inactivePadding;

  // Dynamic scroll view bottom padding that ensures inputs are never obscured by the keyboard
  const scrollPaddingBottom = isKeyboardVisible
    ? keyboardHeight + (options?.activePadding ?? Spacing.xl)
    : Math.max(insets.bottom, Spacing.md) + (options?.inactivePadding ?? 0);

  // Offset for absolute footers above the software keyboard
  const footerOffset = isKeyboardVisible ? keyboardHeight : 0;

  return {
    isKeyboardVisible,
    keyboardHeight,
    bottomInset,
    scrollPaddingBottom,
    footerOffset,
    rawBottomInset: insets.bottom,
  };
}
