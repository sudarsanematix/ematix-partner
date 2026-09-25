import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS === 'web') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (
      args[0]?.includes?.('shadow* style props are deprecated') ||
      args[0]?.includes?.('`useNativeDriver` is not supported') ||
      args[0]?.includes?.('props.pointerEvents is deprecated')
    ) {
      return;
    }
    originalWarn(...args);
  };
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Root '/' is the splash screen — it drives its own navigation.
    const isAuthRoute = pathname === '/login' || pathname === '/signup';

    if (!user && pathname !== '/' && !isAuthRoute) {
      // Not logged in and not on an auth screen → send to login
      router.replace('/login');
    } else if (user && isAuthRoute) {
      // Logged in and on login/signup → go to home
      router.replace('/(tabs)/home');
    }
  }, [user, loading, pathname, router]);

  // Always render the navigator. Routing happens in the effect above; the
  // (tabs) layout guards its own screens from flashing while logged out.
  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar hidden />
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </AuthGuard>
        </SafeAreaProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
