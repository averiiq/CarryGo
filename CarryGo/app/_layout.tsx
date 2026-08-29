import { AlertProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Redirect, Stack, useSegments } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppQueryProvider } from '@/lib/query/QueryProvider';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/useAuth';
import { OfflineBanner } from '@/components/ui/AsyncState';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { ActivityIndicator, View, Text, Pressable, LogBox, StyleSheet } from 'react-native';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { captureException, initMonitoring } from '@/lib/monitoring';
import { LightColors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

initMonitoring();

LogBox.ignoreLogs([
  'shadow* style props are deprecated. Use boxShadow.',
  '[expo-notifications] Listening to push token changes is not yet fully supported on web. Adding a listener will have no effect.',
]);

const PUBLIC_ROUTE_ROOTS = new Set(['index', 'login', 'onboarding', 'profile-setup', 'legal']);

function AppShell() {
  const { user, isLoading, requiresProfileSetup, sessionError, refreshUser } = useAuth();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const segments = useSegments();
  const routeRoot = segments[0] ?? 'index';
  const isPublicRoute = PUBLIC_ROUTE_ROOTS.has(routeRoot);

  if (isLoading) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: C.background }]}>
        <LinearGradient
          colors={[C.primarySubtle, C.background]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.loadingCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}> 
          <Image
            source={require('../assets/images/splash-logo.png')}
            style={styles.loadingLogo}
            contentFit="contain"
            transition={220}
          />
          <Text style={[styles.loadingTitle, { color: C.textPrimary }]}>Preparing CarryGo</Text>
          <Text style={[styles.loadingSub, { color: C.textMuted }]}>Smart matching and secure messaging</Text>
          <ActivityIndicator color={C.primary} size="small" />
        </View>
      </View>
    );
  }

  if (sessionError && !user) {
    return (
      <View style={[styles.centerError, { backgroundColor: C.background }]}>
        <Text style={[styles.errorTitle, { color: C.error }]}>Unable to connect</Text>
        <Text style={[styles.errorMessage, { color: C.textSecondary }]}>{sessionError}</Text>
        <Pressable
          onPress={refreshUser}
          accessibilityRole="button"
          accessibilityLabel="Retry connecting"
          style={({ pressed }) => [
            styles.retryBtn,
            { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.retryText, { color: C.textInverse }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!user && !isPublicRoute) return <Redirect href="/login" />;
  if (user && requiresProfileSetup && routeRoot !== 'profile-setup') return <Redirect href="/profile-setup" />;

  return (
    <View style={{ flex: 1 }}>
      {!isOnline ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.background }}>
          <OfflineBanner C={C} />
        </View>
      ) : null}
      <AppStack />
    </View>
  );
}

function AppStack() {
  const { C } = useThemeColors();
  const headerStyle = { backgroundColor: C.background };
  const headerOpts = {
    headerStyle,
    headerTintColor: C.textPrimary,
    headerShadowVisible: false,
    headerTitleStyle: {
      fontWeight: FontWeight.semibold,
      fontSize: FontSize.md,
    },
    headerBackTitleVisible: false,
  } as const;

  return (
    <>
      <StatusBar style={C.statusBarStyle} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
          contentStyle: { backgroundColor: C.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="profile-setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create-trip" options={{ headerShown: true, headerTitle: 'Post a Trip', ...headerOpts }} />
        <Stack.Screen name="create-parcel" options={{ headerShown: true, headerTitle: 'Send a Parcel', ...headerOpts }} />
        <Stack.Screen name="matching" options={{ headerShown: true, headerTitle: 'Matching Results', ...headerOpts }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true, headerTitle: 'Chat', ...headerOpts }} />
        <Stack.Screen name="delivery/[id]" options={{ headerShown: true, headerTitle: 'Track Delivery', ...headerOpts }} />
        <Stack.Screen name="payment/[id]" options={{ headerShown: true, headerTitle: 'Payment Status', ...headerOpts }} />
        <Stack.Screen name="transactions" options={{ headerShown: false }} />
        <Stack.Screen name="subscriptions" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="trip/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="parcel/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="my-activity" options={{ headerShown: false }} />
        <Stack.Screen name="kyc" options={{ headerShown: false }} />
        <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
        <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <AlertProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppQueryProvider>
              <AuthProvider>
                <AppShell />
              </AuthProvider>
            </AppQueryProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </AlertProvider>
    </AppErrorBoundary>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  captureException(error, { source: 'ExpoRouterErrorBoundary' });

  const C = LightColors;

  return (
    <View style={[styles.centerError, { backgroundColor: C.background }]}>
      <Text style={[styles.errorTitle, { color: C.error }]}>Oops, something went wrong</Text>
      <Text style={[styles.errorMessage, { color: C.textSecondary }]}>{error.message}</Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading the application"
        style={({ pressed }) => [styles.retryBtn, { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={[styles.retryText, { color: C.textInverse }]}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 300,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  loadingLogo: {
    width: 76,
    height: 76,
  },
  loadingTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  loadingSub: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: 2,
  },
  centerError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  retryBtn: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  retryText: {
    fontWeight: FontWeight.semibold,
  },
});
