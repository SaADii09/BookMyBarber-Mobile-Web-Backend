import { Calendar, Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui';
import { COLORS } from '@/constants/design-tokens';
import { home } from '@/constants/home-ui';

type DashboardActionCardsProps = {
  onAddShop: () => void;
};

export function DashboardActionCards({ onAddShop }: DashboardActionCardsProps) {
  return (
    <View className={home.actionRow}>
      <HapticPressable
        haptic="medium"
        className={`${home.actionCard} ${home.actionCardPrimary}`}
        onPress={onAddShop}>
        <View className={home.actionIconWellPrimary}>
          <Plus size={20} color={COLORS.primary} />
        </View>
        <ThemedText className="mt-3 font-heading text-base font-bold text-foreground">
          Add shop
        </ThemedText>
        <ThemedText className="mt-1 font-body text-xs text-muted-foreground">
          Register a new salon
        </ThemedText>
      </HapticPressable>

      <HapticPressable
        haptic="medium"
        className={`${home.actionCard} ${home.actionCardSecondary}`}
        onPress={() => router.push('/barber')}>
        <View className={home.actionIconWellSecondary}>
          <Calendar size={20} color={COLORS.primary} />
        </View>
        <ThemedText className="mt-3 font-heading text-base font-bold text-foreground">
          Studio
        </ThemedText>
        <ThemedText className="mt-1 font-body text-xs text-muted-foreground">
          Services, bookings & calendar
        </ThemedText>
      </HapticPressable>
    </View>
  );
}
