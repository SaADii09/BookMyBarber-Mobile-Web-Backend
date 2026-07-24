import { useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';

import { HapticPressable } from '@/components/ui';
import { COLORS } from '@/constants/design-tokens';
import { ThemedText } from '@/components/themed-text';

function computeRemainingSeconds(lockedUntil: string): number {
  const diff = new Date(lockedUntil).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 1000) : 0;
}

function formatCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AccountLockedPage() {
  const { lockedUntil, reason } = useLocalSearchParams<{
    lockedUntil: string;
    reason?: string;
  }>();
  const [remaining, setRemaining] = useState(lockedUntil ? computeRemainingSeconds(lockedUntil) : 0);

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      const secs = computeRemainingSeconds(lockedUntil);
      setRemaining(secs);
      if (secs <= 0) {
        clearInterval(id);
        router.replace('/(auth)/login');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const reasonText =
    reason === 'send'
      ? 'Too many verification code requests.'
      : 'Too many failed verification attempts.';

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center">

          <ShieldAlert size={56} color={COLORS.primary} />

          <ThemedText
            type="title"
            themeColor="primary"
            className="text-center mt-6"
          >
            Account Locked
          </ThemedText>

          <ThemedText
            type="small"
            themeColor="textSecondary"
            className="text-center mt-2 leading-5"
          >
            {reasonText}
          </ThemedText>

          <View className="mt-8 p-6 bg-card border border-border rounded-xl w-64 items-center">
            <ThemedText type="small" themeColor="textSecondary" className="mb-1">
              Unlocks in
            </ThemedText>
            <Text style={{ fontVariant: ['tabular-nums'] }} className="font-heading font-bold text-4xl text-foreground">
              {formatCountdown(remaining)}
            </Text>
          </View>

          <HapticPressable
            haptic="medium"
            className="mt-8 h-12 w-64 items-center justify-center rounded-lg bg-primary"
            onPress={() => {
              Linking.openURL('mailto:support@bookmybarber.com').catch(() => {});
            }}
          >
            <Text className="font-body font-semibold text-sm text-primary-foreground">
              Contact Support
            </Text>
          </HapticPressable>

          <HapticPressable
            className="mt-4"
            onPress={() => router.replace('/(auth)/login')}
          >
            <ThemedText themeColor="primary" type="small" className="font-semibold">
              Back to Sign In
            </ThemedText>
          </HapticPressable>
        </View>
      </ScrollView>
    </View>
  );
}
