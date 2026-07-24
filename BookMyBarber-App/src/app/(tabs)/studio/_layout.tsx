import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { router, Stack, useGlobalSearchParams, usePathname, type Href } from 'expo-router';
import React from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl, Platform, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui/haptic-pressable';
import { AppText } from '@/components/ui/app-text';
import { ShopSelector } from '@/components/barber/shop-selector';
import { BarberStudioProvider, useBarberStudio } from '@/contexts/barber-studio';
import { COLORS } from '@/constants/design-tokens';
import { screen } from '@/constants/ui-classes';

const STUDIO_TABS = [
  { id: 'services', label: 'Services' },
  { id: 'hours', label: 'Hours' },
  { id: 'workers', label: 'Workers' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'details', label: 'Details' },
] as const;

type StudioTab = (typeof STUDIO_TABS)[number]['id'];

export default function StudioLayout() {
  const { shopId } = useGlobalSearchParams<{ shopId?: string }>();
  return (
    <BarberStudioProvider preselectedShopId={shopId}>
      <StudioContent />
    </BarberStudioProvider>
  );
}

function StudioTabBar({ currentTab }: { currentTab: StudioTab }) {
  const handlePress = (tabId: string) => {
    router.replace(`/studio/${tabId}` as Href);
  };

  return (
    <View className="flex-row border-b border-border bg-background">
      {STUDIO_TABS.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <HapticPressable
            key={tab.id}
            className={`flex-1 py-3 items-center ${isActive ? 'border-b-2 border-primary' : ''}`}
            onPress={() => handlePress(tab.id as string)}
          >
            <ThemedText
              className={`font-body text-sm ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
            >
              {tab.label}
            </ThemedText>
          </HapticPressable>
        );
      })}
    </View>
  );
}

function StudioContent() {
  const scheme = useColorScheme();
  const { shops, selectedShopId, loading, setSelectedShop, refreshShops } = useBarberStudio();
  const pathname = usePathname();
  const segments = pathname.split('/');
  const currentTab = (segments[segments.length - 1] || 'services') as StudioTab;
  const isActive = STUDIO_TABS.some((t) => t.id === currentTab);

  if (loading) {
    return (
      <View className={screen.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (shops.length === 0) {
    return (
      <SafeAreaView className={screen.root}>
        <View className={screen.center}>
          <ThemedText className="text-muted-foreground mb-2">No shops yet</ThemedText>
          <AppText variant="caption" className="text-center px-8 mb-4">
            Create a shop from the home screen to access the barber studio.
          </AppText>
          <HapticPressable
            className="bg-primary rounded-xl px-6 py-3"
            onPress={() => router.replace('/(tabs)')}
          >
            <ThemedText className="font-body font-semibold text-primary-foreground">
              Go to Home
            </ThemedText>
          </HapticPressable>
        </View>
      </SafeAreaView>
    );
  }

  const baseStackOptions: NativeStackNavigationOptions = {
    headerShown: false,
    animation: 'fade',
    contentStyle: { backgroundColor: 'transparent' },
  };

  const studioScreenOptions = Platform.OS === 'android'
    ? { ...baseStackOptions, disablePopToTop: true }
    : baseStackOptions;

  return (
    <SafeAreaView className={screen.root}>
      <View className="flex-1">
        <View className="px-5 pt-4 pb-0">
          <View className="flex-row items-center gap-2 mb-1">
            <ThemedText type="subtitle">Studio</ThemedText>
          </View>
          <ThemedText themeColor="textSecondary" className="text-sm mb-4">
            Manage services, hours, workers & bookings
          </ThemedText>

          <ShopSelector
            shops={shops}
            selectedShopId={selectedShopId}
            onSelect={setSelectedShop}
            loading={false}
          />
        </View>

        <StudioTabBar currentTab={isActive ? currentTab : 'services'} />

        <Stack screenOptions={studioScreenOptions}>
          <Stack.Screen name="index" />
          <Stack.Screen name="services" />
          <Stack.Screen name="hours" />
          <Stack.Screen name="workers" />
          <Stack.Screen name="details" />
          <Stack.Screen name="inbox" />
        </Stack>
      </View>
    </SafeAreaView>
  );
}
