import React, { useRef, useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  Keyboard,
  Platform,
  KeyboardEvent,
  StyleSheet,
  ViewStyle,
  TextInput,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '@/constants/theme';

export interface KeyboardAwareContextType {
  registerFocusedInput: (node: any) => void;
  scrollInputIntoView: (node: any) => void;
}

export const KeyboardAwareContext = createContext<KeyboardAwareContextType | null>(null);

export function useKeyboardAware() {
  return useContext(KeyboardAwareContext);
}

export interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  extraScrollHeight?: number;
  containerStyle?: ViewStyle;
}

export const KeyboardAwareScrollView = React.forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  function KeyboardAwareScrollView(
    {
      children,
      contentContainerStyle,
      extraScrollHeight = 75,
      keyboardShouldPersistTaps = 'handled',
      keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag',
      onScroll: userOnScroll,
      ...props
    },
    ref
  ) {
    const insets = useSafeAreaInsets();
    const internalRef = useRef<ScrollView>(null);
    const scrollRef = (ref as React.RefObject<ScrollView>) || internalRef;

    const focusedNodeRef = useRef<any>(null);
    const scrollYRef = useRef<number>(0);
    const keyboardHeightRef = useRef<number>(0);

    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const handleScroll = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
        userOnScroll?.(e);
      },
      [userOnScroll]
    );

    const performScrollIntoView = useCallback(
      (targetNode?: any, forcedKeyboardHeight?: number) => {
        if (!scrollRef.current) return;

        const currentKHeight = forcedKeyboardHeight ?? keyboardHeightRef.current;
        if (currentKHeight <= 0) return;

        // Resolve component instance
        let nodeToMeasure = targetNode ?? focusedNodeRef.current;
        if (nodeToMeasure && nodeToMeasure.current) {
          nodeToMeasure = nodeToMeasure.current;
        }

        // Universal fallback to TextInput.State in React Native
        if (!nodeToMeasure || typeof nodeToMeasure.measureInWindow !== 'function') {
          try {
            nodeToMeasure = (TextInput as any).State?.currentlyFocusedInput?.();
          } catch {
            // ignore
          }
        }

        if (!nodeToMeasure || typeof nodeToMeasure.measureInWindow !== 'function') {
          return;
        }

        try {
          nodeToMeasure.measureInWindow((x: number, y: number, width: number, height: number) => {
            if (width === 0 && height === 0) return;

            const windowHeight = Dimensions.get('window').height;
            const keyboardTop = windowHeight - currentKHeight;
            const desiredBottom = keyboardTop - extraScrollHeight;
            const currentBottom = y + height;

            if (currentBottom > desiredBottom) {
              const diff = currentBottom - desiredBottom;
              const targetScrollY = scrollYRef.current + diff;
              scrollRef.current?.scrollTo({
                y: Math.max(0, targetScrollY),
                animated: true,
              });
            } else if (y < 80) {
              const diff = 80 - y;
              const targetScrollY = Math.max(0, scrollYRef.current - diff);
              scrollRef.current?.scrollTo({
                y: targetScrollY,
                animated: true,
              });
            }
          });
        } catch {
          // Graceful fallback
        }
      },
      [extraScrollHeight, scrollRef]
    );

    const registerFocusedInput = useCallback(
      (node: any) => {
        focusedNodeRef.current = node;
        if (isKeyboardVisible && keyboardHeightRef.current > 0) {
          requestAnimationFrame(() => {
            performScrollIntoView(node, keyboardHeightRef.current);
          });
          setTimeout(() => {
            performScrollIntoView(node, keyboardHeightRef.current);
          }, 80);
        }
      },
      [isKeyboardVisible, performScrollIntoView]
    );

    const scrollInputIntoView = useCallback(
      (node: any) => {
        performScrollIntoView(node);
      },
      [performScrollIntoView]
    );

    useEffect(() => {
      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

      const onShow = (e: KeyboardEvent) => {
        const h = e.endCoordinates.height;
        keyboardHeightRef.current = h;
        setIsKeyboardVisible(true);
        setKeyboardHeight(h);

        requestAnimationFrame(() => {
          performScrollIntoView(focusedNodeRef.current, h);
        });
        setTimeout(() => {
          performScrollIntoView(focusedNodeRef.current, h);
        }, 60);
        setTimeout(() => {
          performScrollIntoView(focusedNodeRef.current, h);
        }, 180);
        setTimeout(() => {
          performScrollIntoView(focusedNodeRef.current, h);
        }, 320);
      };

      const onHide = () => {
        keyboardHeightRef.current = 0;
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
        focusedNodeRef.current = null;
      };

      const showSub = Keyboard.addListener(showEvent, onShow);
      const hideSub = Keyboard.addListener(hideEvent, onHide);

      let androidShowSub: any = null;
      let androidHideSub: any = null;
      if (Platform.OS === 'android') {
        androidShowSub = Keyboard.addListener('keyboardDidShow', onShow);
        androidHideSub = Keyboard.addListener('keyboardDidHide', onHide);
      }

      return () => {
        showSub.remove();
        hideSub.remove();
        androidShowSub?.remove();
        androidHideSub?.remove();
      };
    }, [performScrollIntoView]);

    const flattenedContentStyle = StyleSheet.flatten(contentContainerStyle) || {};
    const basePadding =
      typeof flattenedContentStyle.paddingBottom === 'number'
        ? flattenedContentStyle.paddingBottom
        : insets.bottom + Spacing.lg;

    const dynamicPaddingBottom = isKeyboardVisible
      ? basePadding + keyboardHeight + extraScrollHeight + 40
      : basePadding;

    return (
      <KeyboardAwareContext.Provider value={{ registerFocusedInput, scrollInputIntoView }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[contentContainerStyle, { paddingBottom: dynamicPaddingBottom }]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          keyboardDismissMode={keyboardDismissMode}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          {...props}
        >
          {children}
        </ScrollView>
      </KeyboardAwareContext.Provider>
    );
  }
);
