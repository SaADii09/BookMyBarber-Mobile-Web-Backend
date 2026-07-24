import '@/global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BrandedSplash } from '@/components/branded-splash';
import { ApiConnectivityProvider } from '@/contexts/api-connectivity';
import { AppDialogProvider } from '@/contexts/app-dialog';
import { AuthSessionProvider, useAuthSession } from '@/contexts/auth-session';
import { SystemBarsProvider } from '@/contexts/system-bars';
import { COLORS } from '@/constants/design-tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Playfair Display': PlayfairDisplay_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.splashBackground }}>
      <SystemBarsProvider>
        <ApiConnectivityProvider>
          <AppDialogProvider>
            <AuthSessionProvider>
              <AppShell fontsLoaded={fontsLoaded} />
            </AuthSessionProvider>
          </AppDialogProvider>
        </ApiConnectivityProvider>
      </SystemBarsProvider>
    </GestureHandlerRootView>
  );
}

function AppShell({ fontsLoaded }: { fontsLoaded: boolean }) {
  const colorScheme = useColorScheme();
  const { status, sessionKey } = useAuthSession();
  const isAuthenticated = status === 'authenticated';
  const isGuest = status === 'guest';

  useEffect(() => {
    if (fontsLoaded && status !== 'loading') {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, status]);

  if (!fontsLoaded || status === 'loading') {
    return <BrandedSplash />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {/* Single Stack + Protected: Expo Router always knows about (auth)/(tabs).
          Dual conditional Stacks caused "(auth)" group title to leak as a header. */}
      <Stack
        key={sessionKey}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 200,
        }}>
        <Stack.Protected guard={isGuest}>
          <Stack.Screen
            name="(auth)"
            options={{ headerShown: false, header: () => null, title: '' }}
          />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="checkout" options={{ headerShown: false }} />
          <Stack.Screen name="book" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* Auth-gated screens at root Stack level (outside Protected) so they're
            discoverable when navigating from nested navigators like (tabs).
            Screens themselves verify auth and redirect if needed. */}
        <Stack.Screen
          name="style-guide"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="capture"
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="support"
          options={{ headerShown: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
