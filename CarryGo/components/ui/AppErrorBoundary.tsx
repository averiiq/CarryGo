import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { captureException } from '@/lib/monitoring';
import { getUserErrorMessage, getErrorTitle } from '@/lib/error-handler';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export function InlineErrorRecovery({
  title = 'Failed to load content',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
}) {
  const { C } = useThemeColors();
  return (
    <View style={[s.inlineContainer, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      <View style={[s.inlineIcon, { backgroundColor: C.errorSubtle }]}>
        <MaterialIcons name="error-outline" size={20} color={C.error} />
      </View>
      <View style={s.inlineTextCol}>
        <Text style={[s.inlineTitle, { color: C.textPrimary }]}>{title}</Text>
        {message ? (
          <Text style={[s.inlineMessage, { color: C.textSecondary }]}>{message}</Text>
        ) : null}
      </View>
      <Pressable
        onPress={() => {
          Haptic.tap();
          onRetry();
        }}
        style={[s.inlineRetryBtn, { backgroundColor: C.primarySubtle }]}
      >
        <MaterialIcons name="refresh" size={16} color={C.primary} />
        <Text style={[s.inlineRetryText, { color: C.primary }]}>Retry</Text>
      </Pressable>
    </View>
  );
}

function DefaultErrorFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  const { C } = useThemeColors();
  const title = getErrorTitle(error, 'Something went wrong');
  const userMessage = getUserErrorMessage(
    error,
    'An unexpected error occurred while displaying this content.'
  );

  const handleReturnHome = () => {
    Haptic.confirm();
    onReset();
    router.replace('/');
  };

  const handleTryAgain = () => {
    Haptic.tap();
    onReset();
  };

  return (
    <View style={[s.container, { backgroundColor: C.background }]}>
      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={[s.iconWrap, { backgroundColor: C.errorSubtle }]}>
          <MaterialIcons name="error-outline" size={36} color={C.error} />
        </View>
        <Text style={[s.title, { color: C.textPrimary }]}>{title}</Text>
        <Text style={[s.message, { color: C.textSecondary }]}>{userMessage}</Text>

        <View style={s.actionsCol}>
          <Pressable
            style={({ pressed }) => [
              s.button,
              { backgroundColor: C.primary },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleTryAgain}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <MaterialIcons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={s.buttonText}>Try Again</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.secondaryButton,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleReturnHome}
            accessibilityRole="button"
            accessibilityLabel="Return to home screen"
          >
            <MaterialIcons name="home" size={18} color={C.textPrimary} style={{ marginRight: 6 }} />
            <Text style={[s.secondaryButtonText, { color: C.textPrimary }]}>Return to Home</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureException(error, {
      source: 'ErrorBoundary',
      componentStack: info.componentStack ?? undefined,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  actionsCol: {
    width: '100%',
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  inlineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTextCol: {
    flex: 1,
  },
  inlineTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  inlineMessage: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  inlineRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  inlineRetryText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
