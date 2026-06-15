import React, { useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { COLORS } from '@/constants/design-tokens';
import { screen } from '@/constants/ui-classes';
import { appAlert } from '@/lib/app-alert';
import { createCheckout, getPaymentStatus } from '@/lib/payments';

export default function CheckoutScreen() {
  const { bookingId, amountPkr } = useLocalSearchParams<{
    bookingId: string;
    amountPkr: string;
  }>();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [tracker, setTracker] = useState<string | null>(null);
  const polled = useRef(false);

  React.useEffect(() => {
    (async () => {
      try {
        const result = await createCheckout({
          amountPkr: Number(amountPkr),
          bookingId: String(bookingId),
          source: 'mobile',
        });
        setCheckoutUrl(result.checkoutUrl);
        setTracker(result.trackerToken);
      } catch {
        appAlert('Payment error', 'Could not start checkout');
        router.back();
      }
    })();
  }, [bookingId, amountPkr]);

  const pollPaid = async (token: string) => {
    if (polled.current) return;
    const { payment } = await getPaymentStatus(token);
    if (payment.status === 'paid') {
      polled.current = true;
      appAlert('Payment successful', 'Your booking is paid.');
      router.replace('/bookings');
    }
  };

  if (!checkoutUrl) {
    return (
      <View className={`${screen.center} gap-3`}>
        <ActivityIndicator color={COLORS.primary} />
        <ThemedText themeColor="textSecondary">Loading checkout…</ThemedText>
      </View>
    );
  }

  return (
    <SafeAreaView className={screen.root}>
      <WebView
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={(nav) => {
          const url = nav.url;
          if (url.includes('/external/complete') && tracker) {
            pollPaid(tracker);
          }
          if (url.includes('/external/error')) {
            appAlert('Payment cancelled');
            router.back();
          }
        }}
      />
    </SafeAreaView>
  );
}
