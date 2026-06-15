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
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthOverlay } from '@/components/auth-overlay';
import { ApiConnectivityProvider } from '@/contexts/api-connectivity';
import { AppDialogProvider } from '@/contexts/app-dialog';
import { AuthSessionProvider, useAuthSession } from '@/contexts/auth-session';
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ApiConnectivityProvider>
        <AppDialogProvider>
          <AuthSessionProvider>
            <AppShell fontsLoaded={fontsLoaded} />
          </AuthSessionProvider>
        </AppDialogProvider>
      </ApiConnectivityProvider>
    </GestureHandlerRootView>
  );
}

function AppShell({ fontsLoaded }: { fontsLoaded: boolean }) {
  const colorScheme = useColorScheme();
  const { status, sessionKey, onLoginSuccess } = useAuthSession();

  useEffect(() => {
    if (fontsLoaded && status !== 'loading') {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, status]);

  if (!fontsLoaded || status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {status === 'guest' && <AuthOverlay onAuthenticated={onLoginSuccess} />}
      {status === 'authenticated' && (
        <Stack
          key={sessionKey}
          screenOptions={{
            headerBackButtonDisplayMode: 'minimal',
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="barber" options={{ title: 'Barber Studio' }} />
          <Stack.Screen name="checkout" options={{ headerShown: false }} />
          <Stack.Screen name="book" options={{ headerShown: false }} />
        </Stack>
      )}
    </ThemeProvider>
  );
}
