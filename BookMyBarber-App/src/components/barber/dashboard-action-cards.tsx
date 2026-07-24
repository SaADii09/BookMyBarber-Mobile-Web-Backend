import { Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui';
import { COLORS } from '@/constants/design-tokens';

type DashboardActionCardsProps = {
  onAddShop: () => void;
};

export function DashboardActionCards({ onAddShop }: DashboardActionCardsProps) {
  return (
    <View className="flex-row mb-5">
      <HapticPressable
        haptic="medium"
        className="flex-row items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5"
        onPress={onAddShop}>
        <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
          <Plus size={16} color={COLORS.primary} />
        </View>
        <ThemedText className="font-body font-semibold text-sm text-primary">
          Register new salon
        </ThemedText>
      </HapticPressable>
    </View>
  );
}
