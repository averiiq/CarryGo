import React, { Component, ErrorInfo, ReactNode, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Animated, Text, Platform, UIManager } from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const Animations = {
  chat: 'chat',
  noParcel: 'noParcel',
  emailSent: 'emailSent',
  locationFetch: 'locationFetch',
  aadharVerification: 'aadharVerification',
  idVerification: 'idVerification',
  success: 'success',
  matching: 'matching',
  trip: 'trip',
  emptyActivity: 'emptyActivity',
  packageBox: 'packageBox',
  deliveryCar: 'deliveryCar',
  searchEmpty: 'searchEmpty',
  successCheck: 'successCheck',
  radarMatch: 'radarMatch',
} as const;

export type AnimationKey = keyof typeof Animations;

const ANIMATION_SOURCES: Record<AnimationKey, any> = {
  chat: require('@/assets/animations/chat.json'),
  noParcel: require('@/assets/animations/no-parcel.json'),
  emailSent: require('@/assets/animations/email-sent.json'),
  locationFetch: require('@/assets/animations/location-fetch.json'),
  aadharVerification: require('@/assets/animations/aadhar-verification.json'),
  idVerification: require('@/assets/animations/id-verification.json'),
  success: require('@/assets/animations/success.json'),
  matching: require('@/assets/animations/matching.json'),
  trip: require('@/assets/animations/trip.json'),
  emptyActivity: require('@/assets/animations/empty-activity.json'),
  packageBox: require('@/assets/animations/package-box.json'),
  deliveryCar: require('@/assets/animations/delivery-car.json'),
  searchEmpty: require('@/assets/animations/search-empty.json'),
  successCheck: require('@/assets/animations/success-check.json'),
  radarMatch: require('@/assets/animations/radar-match.json'),
};

interface LottieAnimationProps {
  name?: AnimationKey;
  source?: any;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  fallbackIcon?: ReactNode;
}

/**
 * Pure Native Animated Vector Badge (High-res resilient fallback)
 * Shown whenever Lottie animation is loading, unsupported on platform, or during Jest tests.
 */
function NativeAnimatedVectorBadge({ name }: { name?: AnimationKey }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial entrance spring
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 180,
      friction: 10,
      useNativeDriver: true,
    }).start();

    // Subtle gentle floating animation
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 4,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle ambient pulsing glow
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    pulseLoop.start();

    return () => {
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [floatAnim, pulseAnim, scaleAnim]);

  const renderBadgeContent = () => {
    switch (name) {
      case 'chat':
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(0, 74, 173, 0.25)' }]} />
            <LinearGradient
              colors={['#004AAD', '#003080']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="chatbubbles" size={38} color="#FFFFFF" />
            </LinearGradient>
            <View style={[styles.subPill, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Text style={[styles.subPillText, { color: '#004AAD' }]}>MESSAGES</Text>
            </View>
          </View>
        );

      case 'noParcel':
      case 'packageBox':
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(5, 150, 105, 0.2)' }]} />
            <LinearGradient
              colors={['#059669', '#047857']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="inventory-2" size={38} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.subPill}>
              <Text style={styles.subPillText}>PARCEL</Text>
            </View>
          </View>
        );

      case 'emailSent':
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(59, 130, 246, 0.25)' }]} />
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="mail-unread" size={38} color="#FFFFFF" />
            </LinearGradient>
            <View style={[styles.subPill, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Text style={[styles.subPillText, { color: '#1D4ED8' }]}>DISPATCH</Text>
            </View>
          </View>
        );

      case 'locationFetch':
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(16, 185, 129, 0.35)' }]} />
            <LinearGradient
              colors={['#10B981', '#047857']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="near-me" size={38} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.subPill}>
              <Text style={styles.subPillText}>ROUTES</Text>
            </View>
          </View>
        );

      case 'aadharVerification':
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(79, 70, 229, 0.25)' }]} />
            <LinearGradient
              colors={['#4F46E5', '#3730A3']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="fingerprint" size={38} color="#FFFFFF" />
            </LinearGradient>
            <View style={[styles.subPill, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
              <Text style={[styles.subPillText, { color: '#4F46E5' }]}>UIDAI</Text>
            </View>
          </View>
        );

      case 'idVerification':
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(2, 132, 199, 0.25)' }]} />
            <LinearGradient
              colors={['#0284C7', '#0369A1']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="badge" size={38} color="#FFFFFF" />
            </LinearGradient>
            <View style={[styles.subPill, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
              <Text style={[styles.subPillText, { color: '#0284C7' }]}>VERIFY</Text>
            </View>
          </View>
        );

      case 'success':
      case 'successCheck':
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(16, 185, 129, 0.25)' }]} />
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="checkmark-circle" size={42} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.subPill}>
              <Text style={styles.subPillText}>SUCCESS</Text>
            </View>
          </View>
        );

      case 'trip':
      case 'deliveryCar':
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(37, 99, 235, 0.2)' }]} />
            <LinearGradient
              colors={['#0284C7', '#0369A1']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="directions-car" size={38} color="#FFFFFF" />
            </LinearGradient>
            <View style={[styles.subPill, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
              <Text style={[styles.subPillText, { color: '#0369A1' }]}>TRIP</Text>
            </View>
          </View>
        );

      case 'matching':
      case 'radarMatch':
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(16, 185, 129, 0.35)' }]} />
            <LinearGradient
              colors={['#10B981', '#047857']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="radar" size={38} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.subPill}>
              <Text style={styles.subPillText}>MATCHING</Text>
            </View>
          </View>
        );

      case 'emptyActivity':
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(148, 163, 184, 0.3)' }]} />
            <LinearGradient
              colors={['#64748B', '#475569']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="history" size={38} color="#FFFFFF" />
            </LinearGradient>
            <View style={[styles.subPill, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
              <Text style={[styles.subPillText, { color: '#475569' }]}>ACTIVITY</Text>
            </View>
          </View>
        );

      case 'searchEmpty':
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(148, 163, 184, 0.3)' }]} />
            <View style={[styles.gradientCircle, { backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#CBD5E1' }]}>
              <Feather name="search" size={34} color="#64748B" />
            </View>
            <View style={[styles.subPill, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
              <Text style={[styles.subPillText, { color: '#64748B' }]}>NO MATCH</Text>
            </View>
          </View>
        );

      case 'radarMatch':
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(16, 185, 129, 0.35)' }]} />
            <LinearGradient
              colors={['#10B981', '#047857']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="radar" size={38} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.subPill}>
              <Text style={styles.subPillText}>SCANNING</Text>
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.badgeRoot}>
            <Animated.View style={[styles.haloRing, { transform: [{ scale: pulseAnim }], borderColor: 'rgba(16, 185, 129, 0.25)' }]} />
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="checkmark-circle" size={40} color="#FFFFFF" />
            </LinearGradient>
          </View>
        );
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: floatAnim },
          ],
        },
      ]}
    >
      {renderBadgeContent()}
    </Animated.View>
  );
}

// Resilient Error Boundary to ensure fallback badge is always displayed safely
interface ErrorBoundaryProps {
  name?: AnimationKey;
  fallbackIcon?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class LottieErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (__DEV__) {
      console.warn('[LottieAnimation] Caught render error, displaying resilient vector fallback:', error?.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.outerWrap}>
          {this.props.fallbackIcon || <NativeAnimatedVectorBadge name={this.props.name} />}
        </View>
      );
    }
    return this.props.children;
  }
}

const isNativeLottieSupported = (): boolean => {
  if (Platform.OS === 'web') return false;
  try {
    if (typeof (UIManager as any).hasViewManagerConfig === 'function') {
      return Boolean((UIManager as any).hasViewManagerConfig('LottieAnimationView'));
    }
    if (typeof (UIManager as any).getViewManagerConfig === 'function') {
      return Boolean((UIManager as any).getViewManagerConfig('LottieAnimationView'));
    }
    return Boolean((UIManager as any)?.LottieAnimationView);
  } catch {
    return false;
  }
};

function SafeLottieRenderer({
  name,
  animSource,
  autoPlay,
  loop,
  speed,
  style,
  fallbackIcon,
  testID,
}: {
  name?: AnimationKey;
  animSource: any;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: StyleProp<ViewStyle>;
  fallbackIcon?: ReactNode;
  testID?: string;
}) {
  const [hasFailed, setHasFailed] = useState(false);

  // If the native binary lacks the Lottie view manager or native initialization fails,
  // gracefully render the high-res native animated vector illustration.
  if (!isNativeLottieSupported() || hasFailed) {
    return (
      <View style={[styles.outerWrap, style]} testID={testID || (name ? `lottie-${name}` : 'lottie-animation')}>
        {fallbackIcon || <NativeAnimatedVectorBadge name={name} />}
      </View>
    );
  }

  return (
    <LottieView
      source={animSource}
      autoPlay={autoPlay}
      loop={loop}
      speed={speed}
      style={[styles.lottie, style]}
      renderMode={Platform.OS === 'android' ? 'SOFTWARE' : 'AUTOMATIC'}
      enableSafeModeAndroid={true}
      cacheComposition={true}
      onAnimationFailure={(_error) => {
        setHasFailed(true);
      }}
      testID={testID}
    />
  );
}

export function LottieAnimation({
  name,
  source,
  autoPlay = true,
  loop = true,
  speed = 1,
  style,
  testID,
  fallbackIcon,
}: LottieAnimationProps) {
  const animSource = source || (name ? ANIMATION_SOURCES[name] : null);

  if (!animSource) {
    return (
      <View style={[styles.outerWrap, style]}>
        {fallbackIcon || <NativeAnimatedVectorBadge name={name} />}
      </View>
    );
  }

  return (
    <LottieErrorBoundary name={name} fallbackIcon={fallbackIcon}>
      <View style={[styles.outerWrap, style]} testID={testID || (name ? `lottie-${name}` : 'lottie-animation')}>
        <SafeLottieRenderer
          name={name}
          animSource={animSource}
          autoPlay={autoPlay}
          loop={loop}
          speed={speed}
          style={style}
          fallbackIcon={fallbackIcon}
          testID={testID}
        />
      </View>
    </LottieErrorBoundary>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: 140,
    height: 140,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeRoot: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  haloRing: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
  },
  gradientCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  subPill: {
    position: 'absolute',
    bottom: -6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  subPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.6,
  },
});
