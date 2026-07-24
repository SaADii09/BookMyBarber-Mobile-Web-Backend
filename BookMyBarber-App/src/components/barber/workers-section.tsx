import { View, FlatList, Image } from 'react-native';
import { Users } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui/haptic-pressable';
import { EmptyState } from '@/components/ui/empty-state';
import { AppText } from '@/components/ui/app-text';
import { Collapsible } from '@/components/ui/collapsible';
import { PrimaryButton } from '@/components/ui/primary-button';
import { MotiFadeIn } from '@/components/ui/moti-fade-in';
import { card } from '@/constants/ui-classes';
import { COLORS } from '@/constants/design-tokens';

interface WorkerItem {
  id: string;
  name: string;
  phone?: string | null;
  specialties?: string[];
  avatar_url?: string | null;
  is_active?: boolean;
  serviceCount?: number;
}

interface WorkersSectionProps {
  workers: WorkerItem[];
  loading: boolean;
  onAddPress: () => void;
  onEditPress: (worker: WorkerItem) => void;
  onDeletePress: (worker: WorkerItem) => void;
  onAssignServices: (worker: WorkerItem) => void;
  onManageAvailability: (worker: WorkerItem) => void;
}

export function WorkersSection({
  workers,
  loading,
  onAddPress,
  onEditPress,
  onDeletePress,
  onAssignServices,
  onManageAvailability,
}: WorkersSectionProps) {
  const renderWorker = ({ item }: { item: WorkerItem }) => (
    <MotiFadeIn key={item.id} transition={{ type: 'timing', duration: 200 }}>
      <View className="mb-3">
        <Collapsible title={`${item.name}${item.serviceCount != null ? ` · ${item.serviceCount} services` : ''}`}>
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <Image
                source={{ uri: item.avatar_url || 'https://i.pravatar.cc/100' }}
                className="w-12 h-12 rounded-full bg-muted"
              />
              <View className="flex-1">
                <ThemedText className="font-body font-medium text-foreground">
                  {item.name}
                </ThemedText>
                {item.phone ? (
                  <ThemedText className="font-body text-sm text-muted-foreground">
                    {item.phone}
                  </ThemedText>
                ) : null}
                {item.specialties && item.specialties.length > 0 ? (
                  <ThemedText className="font-body text-sm text-muted-foreground">
                    {item.specialties.join(', ')}
                  </ThemedText>
                ) : null}
              </View>
              {!item.is_active && (
                <View className="bg-destructive/10 rounded-full px-2 py-0.5">
                  <ThemedText className="font-body text-xs text-destructive">Inactive</ThemedText>
                </View>
              )}
            </View>

            <View className="flex-row gap-2">
              <HapticPressable
                className="flex-1 border border-primary rounded-xl py-2"
                onPress={() => onEditPress(item)}
              >
                <ThemedText className="font-body font-semibold text-primary text-center">
                  Edit
                </ThemedText>
              </HapticPressable>
              <HapticPressable
                className="flex-1 border border-destructive rounded-xl py-2"
                onPress={() => onDeletePress(item)}
              >
                <ThemedText className="font-body font-semibold text-destructive text-center">
                  Remove
                </ThemedText>
              </HapticPressable>
            </View>

            <View className="flex-row gap-2">
              <HapticPressable
                className="flex-1 bg-secondary rounded-xl py-2"
                onPress={() => onAssignServices(item)}
              >
                <ThemedText className="font-body font-semibold text-foreground text-center">
                  Services
                </ThemedText>
              </HapticPressable>
              <HapticPressable
                className="flex-1 bg-secondary rounded-xl py-2"
                onPress={() => onManageAvailability(item)}
              >
                <ThemedText className="font-body font-semibold text-foreground text-center">
                  Hours
                </ThemedText>
              </HapticPressable>
            </View>
          </View>
        </Collapsible>
      </View>
    </MotiFadeIn>
  );

  if (loading) {
    return (
      <View className="gap-3" style={{ minHeight: 200 }}>
        {[1, 2].map((i) => (
          <View key={i} className={card.base}>
            <View className="h-4 bg-muted/50 rounded w-3/4" />
            <View className="h-3 bg-muted/50 rounded w-1/2 mt-2" />
          </View>
        ))}
      </View>
    );
  }

  if (workers.length === 0) {
    return (
      <View className={card.base}>
        <EmptyState
          icon={<Users size={48} color={COLORS.mutedForeground} />}
          title="No workers yet"
          description="Add workers (barbers/stylists) and assign services they can perform."
          action={{ label: "Add Worker", onPress: onAddPress }}
        />
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row items-center justify-between mb-3">
        <AppText variant="heading" className="text-lg">
          Workers ({workers.length})
        </AppText>
        <PrimaryButton onPress={onAddPress}>
          <ThemedText className="font-body font-semibold text-primary-foreground">+ Add</ThemedText>
        </PrimaryButton>
      </View>
      <FlatList
        data={workers}
        renderItem={renderWorker}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        scrollEnabled={false}
      />
    </View>
  );
}
