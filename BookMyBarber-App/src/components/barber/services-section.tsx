import React from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { Scissors } from "lucide-react-native";
import { ThemedText } from "@/components/themed-text";
import { HapticPressable } from "@/components/ui/haptic-pressable";
import { EmptyState } from "@/components/ui/empty-state";
import { AppText } from "@/components/ui/app-text";
import { Collapsible } from "@/components/ui/collapsible";
import { PrimaryButton } from "@/components/ui/primary-button";
import { MotiFadeIn } from "@/components/ui/moti-fade-in";
import { card } from "@/constants/ui-classes";
import { COLORS } from "@/constants/design-tokens";
import type { ShopServiceRow } from "@/lib/booking-types";

interface ServicesSectionProps {
  services: ShopServiceRow[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onAddPress: () => void;
  onEditPress: (service: ShopServiceRow) => void;
  onDeletePress: (service: ShopServiceRow) => Promise<void>;
}

const formatPrice = (price: number) => `Rs ${price.toLocaleString()}`;

export function ServicesSection({
  services,
  loading,
  refreshing,
  onRefresh,
  onAddPress,
  onEditPress,
  onDeletePress,
}: ServicesSectionProps) {
  const renderService = ({ item }: { item: ShopServiceRow }) => (
    <MotiFadeIn key={item.id} transition={{ type: "timing", duration: 200 }}>
      <View className="mb-3">
        <Collapsible title={`${item.name} • ${formatPrice(item.price_pkr)} • ${item.duration_minutes}min`}>
          <View className="gap-3">
            {item.description ? (
              <View className="p-3 bg-muted/50 rounded-xl">
                <AppText variant="label">DESCRIPTION</AppText>
                <ThemedText className="mt-1 text-muted-foreground">{item.description}</ThemedText>
              </View>
            ) : null}
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
                onPress={() => void onDeletePress(item)}
              >
                <ThemedText className="font-body font-semibold text-destructive text-center">
                  Delete
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
        {[1, 2, 3].map((i) => (
          <View key={i} className={card.base}>
            <View className="h-4 bg-muted/50 rounded w-3/4" />
            <View className="h-3 bg-muted/50 rounded w-1/2 mt-2" />
          </View>
        ))}
      </View>
    );
  }

  if (services.length === 0) {
    return (
      <View className={card.base}>
        <EmptyState
          icon={<Scissors size={48} color={COLORS.mutedForeground} />}
          title="No services yet"
          description="Add your first service so customers can book appointments."
          action={{ label: "Add Service", onPress: onAddPress }}
        />
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row items-center justify-between mb-3">
        <AppText variant="heading" className="text-lg">
          Services ({services.length})
        </AppText>
        <PrimaryButton onPress={onAddPress}>
          <ThemedText className="font-body font-semibold text-primary-foreground">+ Add</ThemedText>
        </PrimaryButton>
      </View>
      <FlatList
        data={services}
        renderItem={renderService}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        scrollEnabled={false}
      />
    </View>
  );
}