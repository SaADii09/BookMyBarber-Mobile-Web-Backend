import type { Href } from 'expo-router';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, useColorScheme, View } from 'react-native';

import { ApiConnectivityBanner } from '@/components/api-connectivity-banner';
import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuthSession } from '@/contexts/auth-session';

export default function TabsLayout() {
  const { user } = useAuthSession();
  const showBookingsTab = user?.role === 'customer';

  return (
    <View className="flex-1">
      <ApiConnectivityBanner variant="compact" />
      <Tabs>
        <TabSlot style={{ height: '100%' }} />
        <TabList asChild>
          <CustomTabList>
            <TabTrigger name="index" href={'/' as Href} asChild>
              <TabButton icon="house.fill">Home</TabButton>
            </TabTrigger>
            <TabTrigger name="explore" href="/explore" asChild>
              <TabButton icon="questionmark.circle.fill">Support</TabButton>
            </TabTrigger>
            {showBookingsTab ? (
              <TabTrigger name="bookings" href="/bookings" asChild>
                <TabButton icon="calendar">Bookings</TabButton>
              </TabTrigger>
            ) : null}
            <TabTrigger name="style-guide" href="/style-guide" asChild>
              <TabButton icon="paintpalette.fill">Style</TabButton>
            </TabTrigger>
            <TabTrigger name="chat" href="/chat" asChild>
              <TabButton icon="bubble.left.and.bubble.right.fill">Chat</TabButton>
            </TabTrigger>
            <TabTrigger name="profile" href="/profile" asChild>
              <TabButton icon="person.circle.fill">Profile</TabButton>
            </TabTrigger>
          </CustomTabList>
        </TabList>
      </Tabs>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  icon?: import('expo-symbols').SymbolViewProps['name'];
};

function TabButton({ children, icon, isFocused, ...props }: TabButtonProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Pressable {...props} className="active:opacity-70">
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        className="flex-row items-center gap-1.5 rounded-xl px-3 py-1">
        {icon ? (
          <SymbolView
            name={icon}
            size={14}
            tintColor={isFocused ? colors.text : colors.textSecondary}
          />
        ) : null}
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View {...props} className="absolute w-full flex-row items-center justify-center p-3">
      <ThemedView
        type="backgroundElement"
        className="max-w-[960px] flex-grow flex-row items-center gap-2 rounded-[20px] px-5 py-2">
        <ThemedText type="smallBold" className="mr-auto">
          BookMyBarber
        </ThemedText>

        {props.children}

        <ExternalLink href="https://docs.expo.dev" asChild>
          <Pressable className="ml-3 flex-row items-center justify-center gap-1">
            <ThemedText type="link">Docs</ThemedText>
            <SymbolView
              tintColor={colors.text}
              name={{ ios: 'arrow.up.right.square', web: 'link' }}
              size={12}
            />
          </Pressable>
        </ExternalLink>
      </ThemedView>
    </View>
  );
}
