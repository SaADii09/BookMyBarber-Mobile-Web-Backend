import React, { useState } from "react";
import { View, FlatList, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Store } from "lucide-react-native";
import { ThemedText } from "@/components/themed-text";
import { HapticPressable } from "@/components/ui/haptic-pressable";
import { PrimaryButton } from "@/components/ui/primary-button";
import { EmptyState } from "@/components/ui/empty-state";
import { AppText } from "@/components/ui/app-text";
import { COLORS } from "@/constants/design-tokens";
import { chip, card } from "@/constants/ui-classes";

export interface ShopOption {
  id: string;
  name: string;
  city: string;
  status: string;
}

interface ShopSelectorProps {
  shops: ShopOption[];
  selectedShopId: string | null;
  onSelect: (shopId: string) => void;
  loading?: boolean;
  onAddShop?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  approved: COLORS.chart2,
  pending: COLORS.chart4,
  rejected: COLORS.destructive,
};

export function ShopSelector({ shops, selectedShopId, onSelect, loading = false, onAddShop }: ShopSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const selectedShop = shops.find((s) => s.id === selectedShopId);
  const statusColor = selectedShop
    ? STATUS_COLORS[selectedShop.status] || COLORS.mutedForeground
    : COLORS.mutedForeground;

  const handleSelect = (shopId: string) => {
    onSelect(shopId);
    setIsOpen(false);
  };

  const renderItem = ({ item }: { item: ShopOption }) => {
    const isSelected = item.id === selectedShopId;
    return (
      <HapticPressable
        className={`${card.base} flex-row items-center justify-between ${
          isSelected ? "border-primary" : ""
        }`}
        onPress={() => handleSelect(item.id)}
      >
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-10 h-10 rounded-full bg-secondary items-center justify-center">
            <ThemedText className="font-heading text-lg text-foreground">
              {item.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View className="flex-1 min-w-0">
            <ThemedText className="font-body font-medium text-foreground" numberOfLines={1}>
              {item.name}
            </ThemedText>
            <AppText variant="caption" className="mt-0.5">
              {item.city}
            </AppText>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <View
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[item.status] || COLORS.mutedForeground }}
          />
          <AppText
            variant="caption"
            style={{ color: STATUS_COLORS[item.status] || COLORS.mutedForeground, textTransform: "capitalize" }}
          >
            {item.status}
          </AppText>
        </View>
      </HapticPressable>
    );
  };

  return (
    <View>
      <HapticPressable
        className={`${chip.base} ${selectedShop ? "" : "opacity-70"}`}
        onPress={() => setIsOpen(true)}
        disabled={loading}
      >
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 min-w-0">
            <AppText variant="label" className="mb-1">SELECT SHOP</AppText>
            <ThemedText className="font-body text-foreground" numberOfLines={1}>
              {selectedShop?.name ?? "Choose a shop…"}
            </ThemedText>
          </View>
          <View className="flex-row items-center gap-2">
            {selectedShop ? (
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
            ) : null}
            <ThemedText className="text-muted-foreground">▼</ThemedText>
          </View>
        </View>
      </HapticPressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable className="flex-1 bg-black/60 justify-end" onPress={() => setIsOpen(false)}>
          <Pressable
            className="bg-background rounded-t-3xl max-h-[85vh] min-h-[300px]"
            style={{ paddingBottom: insets.bottom }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="px-5 pt-5 pb-3 border-b border-border">
              <View className="flex-row items-center justify-between">
                <AppText variant="heading" className="text-xl">Select Shop</AppText>
                <HapticPressable
                  onPress={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-secondary items-center justify-center"
                >
                  <ThemedText className="text-foreground text-sm">✕</ThemedText>
                </HapticPressable>
              </View>
              <AppText variant="caption" className="mt-1 text-muted-foreground">
                {shops.length} shop{shops.length !== 1 ? "s" : ""}
              </AppText>
            </View>

            {loading ? (
              <View className="items-center justify-center py-10">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="w-full px-5 mb-3">
                    <View className="h-16 bg-muted/50 rounded-xl" />
                  </View>
                ))}
              </View>
            ) : shops.length === 0 ? (
              <EmptyState
                icon={<Store size={48} color={COLORS.mutedForeground} />}
                title="No shops yet"
                description="Create a shop from the home screen first."
                action={onAddShop ? { label: "+ Add New Shop", onPress: () => { setIsOpen(false); onAddShop(); } } : undefined}
                className="px-5"
              />
            ) : (
              <View className="flex-1">
                <FlatList
                  data={shops}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: onAddShop ? 80 : 16 }}
                  showsVerticalScrollIndicator={false}
                />
                {onAddShop ? (
                  <View className="px-5 pb-3 pt-2 border-t border-border">
                    <PrimaryButton onPress={() => { setIsOpen(false); onAddShop(); }}>
                      <ThemedText className="font-body font-semibold text-primary-foreground">
                        + Add New Shop
                      </ThemedText>
                    </PrimaryButton>
                  </View>
                ) : null}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}