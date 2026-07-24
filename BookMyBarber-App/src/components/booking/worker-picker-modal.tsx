import { View, ScrollView, Modal, Pressable, Image } from 'react-native';
import { Users } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui/haptic-pressable';
import { EmptyState } from '@/components/ui/empty-state';
import { AppText } from '@/components/ui/app-text';
import { MotiFadeIn } from '@/components/ui/moti-fade-in';
import { COLORS } from '@/constants/design-tokens';
import type { WorkerRow } from '@/lib/booking-types';

interface WorkerPickerModalProps {
  visible: boolean;
  onClose: () => void;
  workers: WorkerRow[];
  selectedWorkerId: string | null;
  onSelect: (workerId: string | null) => void;
  servicesCount?: Record<string, number>;
}

export function WorkerPickerModal({
  visible,
  onClose,
  workers,
  selectedWorkerId,
  onSelect,
  servicesCount,
}: WorkerPickerModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <MotiFadeIn>
            <View className="bg-background rounded-t-3xl max-h-[70vh] min-h-[40vh]">
              <View className="px-5 pt-5 pb-3 border-b border-border">
                <AppText variant="heading" className="text-xl">Select Barber</AppText>
              </View>

              <ScrollView className="px-5 pt-3" contentContainerStyle={{ paddingBottom: 24, gap: 8 }}>
                {/* Any available option */}
                <HapticPressable
                  className={`rounded-xl border p-4 ${
                    selectedWorkerId === null ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                  onPress={() => {
                    onSelect(null);
                    onClose();
                  }}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-muted items-center justify-center">
                      <ThemedText className="font-body text-lg text-muted-foreground">*</ThemedText>
                    </View>
                    <View className="flex-1">
                      <ThemedText className="font-body font-medium text-foreground">
                        Any available
                      </ThemedText>
                      <ThemedText className="font-body text-sm text-muted-foreground">
                        Pick first available barber
                      </ThemedText>
                    </View>
                  </View>
                </HapticPressable>

                {workers.length === 0 ? (
                  <EmptyState
                    icon={<Users size={48} color={COLORS.mutedForeground} />}
                    title="No barbers registered"
                  />
                ) : (
                  workers.map((w) => {
                    const isSelected = selectedWorkerId === w.id;
                    const count = servicesCount?.[w.id];
                    return (
                      <HapticPressable
                        key={w.id}
                        className={`rounded-xl border p-4 ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                        onPress={() => {
                          onSelect(w.id);
                          onClose();
                        }}
                      >
                        <View className="flex-row items-center gap-3">
                          <Image
                            source={{ uri: w.avatar_url || 'https://i.pravatar.cc/100' }}
                            className="w-10 h-10 rounded-full bg-muted"
                          />
                          <View className="flex-1">
                            <ThemedText className="font-body font-medium text-foreground">
                              {w.name}
                            </ThemedText>
                            {count !== undefined && (
                              <ThemedText className="font-body text-sm text-muted-foreground">
                                {count} service{count !== 1 ? 's' : ''}
                              </ThemedText>
                            )}
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
