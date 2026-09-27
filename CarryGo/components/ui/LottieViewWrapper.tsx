import React, { Component, ErrorInfo, ReactNode, useRef } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export const Animations = {
  packageBox: require('@/assets/animations/package-box.json'),
  deliveryCar: require('@/assets/animations/delivery-car.json'),
  searchEmpty: require('@/assets/animations/search-empty.json'),
  successCheck: require('@/assets/animations/success-check.json'),
  radarMatch: require('@/assets/animations/radar-match.json'),
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

// Fallback icon component with a subtle spring entrance
function LottieFallbackBadge({ name }: { name?: AnimationKey }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 160,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const renderIcon = () => {
    switch (name) {
      case 'successCheck':
        return (
          <View style={[styles.fallbackCircle, { backgroundColor: '#ECFDF5', borderColor: '#10B98133' }]}>
            <Ionicons name="checkmark-circle" size={48} color="#059669" />
          </View>
        );
      case 'packageBox':
        return (
          <View style={[styles.fallbackCircle, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
            <MaterialIcons name="inventory-2" size={40} color="#059669" />
          </View>
        );
      case 'deliveryCar':
        return (
          <View style={[styles.fallbackCircle, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
            <MaterialIcons name="directions-car" size={40} color="#059669" />
          </View>
        );
      case 'searchEmpty':
        return (
          <View style={[styles.fallbackCircle, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
            <MaterialIcons name="search-off" size={40} color="#94A3B8" />
          </View>
        );
      case 'radarMatch':
        return (
          <View style={[styles.fallbackCircle, { backgroundColor: '#ECFDF5', borderColor: '#10B98133' }]}>
            <MaterialIcons name="radar" size={40} color="#059669" />
          </View>
        );
      default:
        return (
          <View style={[styles.fallbackCircle, { backgroundColor: '#ECFDF5', borderColor: '#10B98133' }]}>
            <Ionicons name="checkmark-circle" size={44} color="#059669" />
          </View>
        );
    }
  };

  return (
    <Animated.View style={[styles.fallbackContainer, { transform: [{ scale: scaleAnim }] }]}>
      {renderIcon()}
    </Animated.View>
  );
}

// Resilient Error Boundary to ensure LottieView NEVER crashes the parent screen
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

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.warn('[LottieAnimation] Native render caught by boundary:', error?.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallbackIcon || <LottieFallbackBadge name={this.props.name} />;
    }
    return this.props.children;
  }
}

function LottieAnimationInner({
  name,
  source,
  autoPlay = true,
  loop = true,
  speed = 1,
  style,
  testID,
}: LottieAnimationProps) {
  const animationRef = useRef<LottieView>(null);
  const resolvedSource = source || (name ? Animations[name] : null);

  if (!resolvedSource) {
    return <LottieFallbackBadge name={name} />;
  }

  return (
    <View style={[styles.container, style]}>
      <LottieView
        ref={animationRef}
        source={resolvedSource}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={styles.animation}
        renderMode="AUTOMATIC"
        testID={testID}
      />
    </View>
  );
}

export function LottieAnimation(props: LottieAnimationProps) {
  return (
    <LottieErrorBoundary name={props.name} fallbackIcon={props.fallbackIcon}>
      <LottieAnimationInner {...props} />
    </LottieErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  fallbackCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
