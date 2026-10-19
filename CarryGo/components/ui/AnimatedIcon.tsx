import React, { useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Animated,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Haptic } from '@/services/haptics.service';

// Import animation metadata from react-useanimations
import homeAnim from 'react-useanimations/lib/home';
import activityAnim from 'react-useanimations/lib/activity';
import messageSquareAnim from 'react-useanimations/lib/messageSquare';
import messageCircleAnim from 'react-useanimations/lib/messageCircle';
import userAnim from 'react-useanimations/lib/user';
import notificationAnim from 'react-useanimations/lib/notification';
import notification2Anim from 'react-useanimations/lib/notification2';
import searchToXAnim from 'react-useanimations/lib/searchToX';
import filterAnim from 'react-useanimations/lib/filter';
import settingsAnim from 'react-useanimations/lib/settings';
import editAnim from 'react-useanimations/lib/edit';
import calendarAnim from 'react-useanimations/lib/calendar';
import heartAnim from 'react-useanimations/lib/heart';
import checkAnim from 'react-useanimations/lib/check';
import checkmarkAnim from 'react-useanimations/lib/checkmark';
import trashAnim from 'react-useanimations/lib/trash';
import shareAnim from 'react-useanimations/lib/share';
import lockAnim from 'react-useanimations/lib/lock';
import arrowLeftAnim from 'react-useanimations/lib/arrowLeft';
import plusToXAnim from 'react-useanimations/lib/plusToX';
import packageAnim from 'react-useanimations/lib/package';
import truckAnim from 'react-useanimations/lib/truck';
import starAnim from 'react-useanimations/lib/star';
import phoneAnim from 'react-useanimations/lib/phone';
import mailAnim from 'react-useanimations/lib/mail';
import shieldAnim from 'react-useanimations/lib/shield';
import mapPinAnim from 'react-useanimations/lib/mapPin';
import navigationAnim from 'react-useanimations/lib/navigation';
import exploreAnim from 'react-useanimations/lib/explore';
import bookmarkAnim from 'react-useanimations/lib/bookmark';

export const ANIMATED_ICONS = {
  home: homeAnim,
  activity: activityAnim,
  messageSquare: messageSquareAnim,
  messageCircle: messageCircleAnim,
  user: userAnim,
  notification: notificationAnim,
  notification2: notification2Anim,
  searchToX: searchToXAnim,
  filter: filterAnim,
  settings: settingsAnim,
  edit: editAnim,
  calendar: calendarAnim,
  heart: heartAnim,
  check: checkAnim,
  checkmark: checkmarkAnim,
  trash: trashAnim,
  share: shareAnim,
  lock: lockAnim,
  arrowLeft: arrowLeftAnim,
  plusToX: plusToXAnim,
  package: packageAnim,
  truck: truckAnim,
  star: starAnim,
  phone: phoneAnim,
  mail: mailAnim,
  shield: shieldAnim,
  mapPin: mapPinAnim,
  navigation: navigationAnim,
  explore: exploreAnim,
  bookmark: bookmarkAnim,
} as const;

export type AnimatedIconName = keyof typeof ANIMATED_ICONS;

export interface AnimatedIconRef {
  play: (startFrame?: number, endFrame?: number) => void;
  reset: () => void;
  pause: () => void;
}

export interface AnimatedIconProps {
  /** Name of the icon from useanimations.com */
  name: AnimatedIconName;
  /** Size in pixels (width & height), defaults to 24 */
  size?: number;
  /** Tint color of the animated icon */
  color?: string;
  /** Whether the animation should autoPlay on mount */
  autoPlay?: boolean;
  /** Whether the animation should continuously loop */
  loop?: boolean;
  /** Playback speed multiplier (default: 1) */
  speed?: number;
  /** Automatically plays the animation whenever this value updates or is truthy (e.g. isFocused) */
  playOnTrigger?: boolean | number | string;
  /** Container style overrides */
  style?: StyleProp<ViewStyle>;
  /** When true or when onPress is provided, wraps icon in an interactive pressable that plays animation on click */
  interactive?: boolean;
  /** Optional click handler triggered on click along with animation playback and haptic */
  onPress?: (e?: GestureResponderEvent) => void;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Hit area padding for interactive mode */
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
  /** Test identifier for testing */
  testID?: string;
}

interface VectorIconConfig {
  family: 'ionicons' | 'material';
  name: string;
}

const ICON_MAP: Record<AnimatedIconName, VectorIconConfig> = {
  home: { family: 'ionicons', name: 'home-outline' },
  activity: { family: 'ionicons', name: 'pulse-outline' },
  messageSquare: { family: 'ionicons', name: 'chatbubble-ellipses-outline' },
  messageCircle: { family: 'ionicons', name: 'chatbubbles-outline' },
  user: { family: 'ionicons', name: 'person-outline' },
  notification: { family: 'ionicons', name: 'notifications-outline' },
  notification2: { family: 'ionicons', name: 'notifications' },
  searchToX: { family: 'ionicons', name: 'search-outline' },
  filter: { family: 'ionicons', name: 'options-outline' },
  settings: { family: 'ionicons', name: 'settings-outline' },
  edit: { family: 'material', name: 'edit' },
  calendar: { family: 'ionicons', name: 'calendar-outline' },
  heart: { family: 'ionicons', name: 'heart' },
  check: { family: 'ionicons', name: 'checkmark' },
  checkmark: { family: 'ionicons', name: 'checkmark-circle' },
  trash: { family: 'ionicons', name: 'trash-outline' },
  share: { family: 'ionicons', name: 'share-social-outline' },
  lock: { family: 'ionicons', name: 'lock-closed-outline' },
  arrowLeft: { family: 'ionicons', name: 'arrow-back' },
  plusToX: { family: 'ionicons', name: 'add-outline' },
  package: { family: 'material', name: 'inventory-2' },
  truck: { family: 'material', name: 'local-shipping' },
  star: { family: 'ionicons', name: 'star' },
  phone: { family: 'ionicons', name: 'call-outline' },
  mail: { family: 'ionicons', name: 'mail-outline' },
  shield: { family: 'ionicons', name: 'shield-checkmark-outline' },
  mapPin: { family: 'ionicons', name: 'location-outline' },
  navigation: { family: 'ionicons', name: 'navigate-outline' },
  explore: { family: 'ionicons', name: 'compass-outline' },
  bookmark: { family: 'ionicons', name: 'bookmark-outline' },
};

/**
 * AnimatedIcon:
 * Micro-animated interactive icon from useAnimations design pattern.
 * Pure React Native implementation: zero native module crashes, zero bundle bloat,
 * highly responsive with spring physics and tactile haptic feedback.
 */
export const AnimatedIcon = forwardRef<AnimatedIconRef, AnimatedIconProps>(function AnimatedIcon(
  {
    name,
    size = 24,
    color = '#0F172A',
    autoPlay = false,
    loop = false,
    speed = 1,
    playOnTrigger,
    style,
    interactive = false,
    onPress,
    accessibilityLabel,
    hitSlop,
    testID,
  },
  ref
) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const play = useCallback(() => {
    // 1. Play Spring Scale Bounce
    scaleAnim.setValue(0.82);
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 280,
      friction: 5,
      useNativeDriver: true,
    }).start();

    // 2. Specialized micro-animations based on icon type
    if (name === 'notification' || name === 'notification2') {
      // Bell wobble sequence: -18deg -> +18deg -> -12deg -> +8deg -> 0deg
      rotateAnim.setValue(0);
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: -0.6, duration: 70, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0.4, duration: 60, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    } else if (name === 'searchToX' || name === 'filter' || name === 'settings') {
      // Dynamic tilt spin
      rotateAnim.setValue(0);
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(rotateAnim, { toValue: 0, tension: 200, friction: 8, useNativeDriver: true }),
      ]).start();
    } else if (name === 'heart') {
      // Heartbeat double pop
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.3, tension: 350, friction: 6, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 250, friction: 7, useNativeDriver: true }),
      ]).start();
    }
  }, [name, scaleAnim, rotateAnim]);

  const reset = useCallback(() => {
    scaleAnim.setValue(1);
    rotateAnim.setValue(0);
  }, [scaleAnim, rotateAnim]);

  const pause = useCallback(() => {
    scaleAnim.stopAnimation();
    rotateAnim.stopAnimation();
  }, [scaleAnim, rotateAnim]);

  useImperativeHandle(
    ref,
    () => ({
      play,
      reset,
      pause,
    }),
    [play, reset, pause]
  );

  // Play animation whenever playOnTrigger transitions to truthy
  const initialMount = useRef(true);
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      if (playOnTrigger || autoPlay) {
        play();
      }
      return;
    }
    if (playOnTrigger) {
      play();
    }
  }, [playOnTrigger, autoPlay, play]);

  // Continuous subtle loop if requested
  useEffect(() => {
    if (loop) {
      const loopAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.08, duration: 1200 / speed, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 1200 / speed, useNativeDriver: true }),
        ])
      );
      loopAnim.start();
      return () => loopAnim.stop();
    }
  }, [loop, speed, scaleAnim]);

  const handlePress = useCallback(
    (e?: GestureResponderEvent) => {
      Haptic.tap();
      play();
      onPress?.(e);
    },
    [play, onPress]
  );

  const iconConfig = ICON_MAP[name] || { family: 'ionicons', name: 'ellipse' };

  const spin = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  const content = (
    <Animated.View
      testID={testID}
      pointerEvents={interactive || onPress ? 'auto' : 'none'}
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: scaleAnim }, { rotate: spin }],
        },
        style,
      ]}
    >
      {iconConfig.family === 'material' ? (
        <MaterialIcons
          name={iconConfig.name as any}
          size={size}
          color={color}
          style={{ textAlign: 'center' }}
        />
      ) : (
        <Ionicons
          name={iconConfig.name as any}
          size={size}
          color={color}
          style={{ textAlign: 'center' }}
        />
      )}
    </Animated.View>
  );

  if (interactive || onPress) {
    return (
      <Pressable
        onPress={handlePress}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || `${name} icon`}
        style={styles.pressable}
      >
        {content}
      </Pressable>
    );
  }

  return content;
});

/**
 * InteractiveAnimatedIcon: Convenience component that always renders as an interactive, clickable icon
 */
export function InteractiveAnimatedIcon(props: AnimatedIconProps) {
  return <AnimatedIcon interactive {...props} />;
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
