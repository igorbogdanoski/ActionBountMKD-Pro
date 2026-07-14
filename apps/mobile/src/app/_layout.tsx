import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, ActivityIndicator, View, AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../utils/AuthContext';
import {
  addNotificationResponseListener,
  addPushTokenSyncListener,
  handleInitialNotificationAsync,
  syncNotificationRegistrationAsync,
} from '../utils/notifications';
import { syncOfflineQueue } from '../utils/offlineQueue';
// import { AnimatedSplashOverlay } from '@/components/animated-icon'; // Disable for now to test simple auth

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!user && !inAuthGroup) {
        // give router a tiny bit to mount 
        setTimeout(() => router.replace('/login'), 0);
    } else if (user && inAuthGroup) {
        setTimeout(() => router.replace('/'), 0);
    }
  }, [user, loading, segments]);

  useEffect(() => {
    // Retry any queued offline quest results whenever the app comes back to
    // the foreground — the cheapest available signal for "connectivity may
    // have returned" without adding a NetInfo dependency.
    void syncOfflineQueue().catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncOfflineQueue().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    void handleInitialNotificationAsync((url) => router.push(url as never));
    const responseSubscription = addNotificationResponseListener((url) => {
      router.push(url as never);
    });

    return () => {
      responseSubscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;

    void syncNotificationRegistrationAsync(user.uid);
    const pushTokenSubscription = addPushTokenSyncListener(user.uid);

    return () => {
      pushTokenSubscription.remove();
    };
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
