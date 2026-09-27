import React, { Component, ErrorInfo, ReactNode, useRef, useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Animated, Text } from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const Animations = {
  packageBox: 'packageBox',
  deliveryCar: 'deliveryCar',
  searchEmpty: 'searchEmpty',
  successCheck: 'successCheck',
  radarMatch: 'radarMatch',
};

export type AnimationKey = keyof typeof Animations;

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
 * Pure Native Animated Vector Badge
 * Replaces heavy/buggy Lottie animations with sleek, fintech-grade animated vector illustrations.
 * Zero Lottie dependencies in the rendered UI for superior stability, speed, and aesthetics.
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
          </View>
        );

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
              <Text style={[styles.subPillText, { color: '#0369A1' }]}>TRANSIT</Text>
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

class LottieErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  render() {
    if (this.state.hasError) {
      return this.props.fallbackIcon || <NativeAnimatedVectorBadge name={this.props.name} />;
    }
    return this.props.children;
  }
}

export function LottieAnimation(props: LottieAnimationProps) {
  return (
    <LottieErrorBoundary name={props.name} fallbackIcon={props.fallbackIcon}>
      <View style={[styles.outerWrap, props.style]}>
        <NativeAnimatedVectorBadge name={props.name} />
      </View>
    </LottieErrorBoundary>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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
