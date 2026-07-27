import { AlertProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Redirect, Stack, useSegments } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AppQueryProvider } from '@/lib/query/QueryProvider';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/useAuth';
import { OfflineBanner } from '@/components/ui/AsyncState';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { ActivityIndicator, View, Text, Pressable } from 'react-native';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { captureException, initMonitoring } from '@/lib/monitoring';

initMonitoring();

const PUBLIC_ROUTE_ROOTS = new Set(['index', 'login', 'onboarding', 'profile-setup']);

function AppShell() {
  const { user, isLoading, requiresProfileSetup, sessionError, refreshUser } = useAuth();
  const { C } = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const segments = useSegments();
  const routeRoot = segments[0] ?? 'index';
  const isPublicRoute = PUBLIC_ROUTE_ROOTS.has(routeRoot);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }
  if (sessionError && !user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.background }}>
        <Text style={{ fontSize: 16, color: C.textSecondary, textAlign: 'center', marginBottom: 16 }}>
          {sessionError}
        </Text>
        <Pressable
          onPress={refreshUser}
          accessibilityRole="button"
          accessibilityLabel="Retry connecting"
          style={{ backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
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
  const { isDark } = useTheme();
  const headerStyle = { backgroundColor: isDark ? '#080808' : '#FFFFFF' };
  const headerOpts = { headerStyle, headerTintColor: isDark ? '#F4F4F5' : '#111827', headerShadowVisible: false };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
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

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#060608' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F87171', marginBottom: 12 }}>Oops, something went wrong</Text>
      <Text style={{ fontSize: 16, color: '#A1A1AA', textAlign: 'center', marginBottom: 24 }}>{error.message}</Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading the application"
        style={{ backgroundColor: '#22C55E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</Text>
      </Pressable>
    </View>
  );
}
