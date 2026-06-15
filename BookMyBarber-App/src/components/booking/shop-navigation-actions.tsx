import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui';
import { btn } from '@/constants/ui-classes';
import { useShopNavigation } from '@/hooks/use-shop-navigation';
import type { ShopNavTarget } from '@/lib/booking-types';

type Props = {
  shop: ShopNavTarget;
  compact?: boolean;
};

export function ShopNavigationActions({ shop, compact }: Props) {
  const {
    isTracking,
    routeMeta,
    startTrackingToShop,
    stopTracking,
    openExternalNavigation,
  } = useShopNavigation();

  return (
    <View className={compact ? 'gap-2' : 'gap-3'}>
      <View className="flex-row flex-wrap gap-2">
        <HapticPressable
          className={`${btn.secondary} flex-1 min-w-[120px]`}
          onPress={() =>
            isTracking ? stopTracking() : void startTrackingToShop(shop)
          }>
          <ThemedText className={btn.secondaryText}>
            {isTracking ? 'Stop tracking' : 'Track route'}
          </ThemedText>
        </HapticPressable>
        <HapticPressable
          className={`${btn.secondary} flex-1 min-w-[120px]`}
          onPress={() => openExternalNavigation(shop)}>
          <ThemedText className={btn.secondaryText}>Open in Maps</ThemedText>
        </HapticPressable>
      </View>
      {routeMeta ? (
        <ThemedText selectable className="font-body text-sm text-muted-foreground">
          Route: {(routeMeta.distanceMeters / 1000).toFixed(1)} km ·{' '}
          {Math.ceil(routeMeta.durationSeconds / 60)} min
        </ThemedText>
      ) : null}
    </View>
  );
}
