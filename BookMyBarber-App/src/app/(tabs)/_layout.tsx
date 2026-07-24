import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { View, useColorScheme } from 'react-native';

import { ApiConnectivityBanner } from '@/components/api-connectivity-banner';
import { Colors } from '@/constants/theme';
import { useAuthSession } from '@/contexts/auth-session';
import { useSystemBars } from '@/hooks/use-system-bars';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { user } = useAuthSession();
  const showBookingsTab = user?.role === 'customer';

  // Sync system bars to tab background. On Android 15+ the nav bar is
  // transparent — the tab bar bg shows through, so matching icon style
  // ensures nav buttons remain readable.
  useSystemBars({
    statusBarStyle: scheme === 'dark' ? 'light' : 'dark',
    navigationBarStyle: scheme === 'dark' ? 'light' : 'dark',
  });

  return (
    <View className="flex-1">
      <ApiConnectivityBanner variant="compact" />
      {/* NativeTabs handles bottom safe area automatically — 
          do NOT add disableAutomaticContentInsets, it skips the 
          native tab bar's content inset adjustment on Android 
          (causing content to overlap the tab bar) */}
      {/* tintColor controls the selected tab's ICON + label color on
          both platforms. Without it, Android Material 3 uses the system
          accent which can be white — invisible on cream bg. */}
      <NativeTabs
        backgroundColor={colors.background}
        tintColor={colors.text}
        indicatorColor={colors.backgroundElement}
        labelStyle={{ selected: { color: colors.text } }}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
            md="home"
          />
        </NativeTabs.Trigger>

        {showBookingsTab ? (
          <NativeTabs.Trigger name="bookings">
            <NativeTabs.Trigger.Label>Bookings</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: 'calendar', selected: 'calendar.badge.clock' }}
              md="event"
            />
          </NativeTabs.Trigger>
        ) : null}

        {user?.role === 'barber' ? (
          <NativeTabs.Trigger name="studio">
            <NativeTabs.Trigger.Label>Studio</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: 'scissors', selected: 'scissors.circle.fill' }}
              md="content_cut"
            />
          </NativeTabs.Trigger>
        ) : null}

        <NativeTabs.Trigger name="chat">
          <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{
              default: 'bubble.left.and.bubble.right',
              selected: 'bubble.left.and.bubble.right.fill',
            }}
            md="chat"
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'person.circle', selected: 'person.circle.fill' }}
            md="person"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}
