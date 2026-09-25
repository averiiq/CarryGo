import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { captureException } from '@/lib/monitoring';
import { getUserErrorMessage, getErrorTitle } from '@/lib/error-handler';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

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

  return (
    <View style={[s.container, { backgroundColor: C.background }]}>
      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
        <View style={[s.iconWrap, { backgroundColor: C.errorSubtle }]}>
          <MaterialIcons name="error-outline" size={36} color={C.error} />
        </View>
        <Text style={[s.title, { color: C.textPrimary }]}>{title}</Text>
        <Text style={[s.message, { color: C.textSecondary }]}>{userMessage}</Text>
        <Pressable
          style={({ pressed }) => [s.button, { backgroundColor: C.primary }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <MaterialIcons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={s.buttonText}>Try Again</Text>
        </Pressable>
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
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 140,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
