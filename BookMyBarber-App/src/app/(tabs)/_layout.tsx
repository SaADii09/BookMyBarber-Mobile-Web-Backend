import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { View, useColorScheme } from 'react-native';

import { ApiConnectivityBanner } from '@/components/api-connectivity-banner';
import { Colors } from '@/constants/theme';
import { useAuthSession } from '@/contexts/auth-session';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { user } = useAuthSession();
  const showBookingsTab = user?.role === 'customer';

  return (
    <View className="flex-1">
      <ApiConnectivityBanner variant="compact" />
      <NativeTabs
        backgroundColor={colors.background}
        indicatorColor={colors.backgroundElement}
        labelStyle={{ selected: { color: colors.text } }}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
            md="home"
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="explore">
          <NativeTabs.Trigger.Label>Support</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'questionmark.circle', selected: 'questionmark.circle.fill' }}
            md="support_agent"
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

        <NativeTabs.Trigger name="style-guide">
          <NativeTabs.Trigger.Label>Style</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'paintpalette', selected: 'paintpalette.fill' }}
            md="palette"
          />
        </NativeTabs.Trigger>

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
