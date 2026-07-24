import { View, ScrollView, Modal, Pressable } from 'react-native';
import { Scissors } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui/haptic-pressable';
import { EmptyState } from '@/components/ui/empty-state';
import { AppText } from '@/components/ui/app-text';
import { MotiFadeIn } from '@/components/ui/moti-fade-in';
import { COLORS } from '@/constants/design-tokens';
import type { ShopServiceRow } from '@/lib/booking-types';

interface ServicePickerModalProps {
  visible: boolean;
  onClose: () => void;
  services: ShopServiceRow[];
  selectedServiceId: string | null;
  onSelect: (service: ShopServiceRow) => void;
}

export function ServicePickerModal({
  visible,
  onClose,
  services,
  selectedServiceId,
  onSelect,
}: ServicePickerModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <MotiFadeIn>
            <View className="bg-background rounded-t-3xl max-h-[70vh] min-h-[40vh]">
              <View className="px-5 pt-5 pb-3 border-b border-border">
                <AppText variant="heading" className="text-xl">Select Service</AppText>
              </View>

              <ScrollView className="px-5 pt-3" contentContainerStyle={{ paddingBottom: 24, gap: 8 }}>
                {services.length === 0 ? (
                  <EmptyState
                    icon={<Scissors size={48} color={COLORS.mutedForeground} />}
                    title="No services available"
                  />
                ) : (
                  services.map((s) => {
                    const isSelected = selectedServiceId === s.id;
                    return (
                      <HapticPressable
                        key={s.id}
                        className={`rounded-xl border p-4 ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                        onPress={() => {
                          onSelect(s);
                          onClose();
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <ThemedText className="font-body font-medium text-foreground">
                              {s.name}
                            </ThemedText>
                            {s.description ? (
                              <ThemedText className="font-body text-sm text-muted-foreground mt-0.5">
                                {s.description}
                              </ThemedText>
                            ) : null}
                          </View>
                          <View className="items-end ml-3">
                            <ThemedText className="font-body font-semibold text-primary">
                              Rs {s.price_pkr}
                            </ThemedText>
                            <ThemedText className="font-body text-xs text-muted-foreground">
                              {s.duration_minutes} min
                            </ThemedText>
                          </View>
                        </View>
                      </HapticPressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </MotiFadeIn>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
