import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Scissors } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui/haptic-pressable';
import { EmptyState } from '@/components/ui/empty-state';
import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { MotiFadeIn } from '@/components/ui/moti-fade-in';
import { COLORS } from '@/constants/design-tokens';
import type { ShopServiceRow } from '@/lib/booking-types';

interface WorkerServicesModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (serviceIds: string[]) => Promise<void>;
  allServices: ShopServiceRow[];
  assignedServiceIds: string[];
  workerName: string;
  loading?: boolean;
}

export function WorkerServicesModal({
  visible,
  onClose,
  onSave,
  allServices,
  assignedServiceIds,
  workerName,
  loading = false,
}: WorkerServicesModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected(new Set(assignedServiceIds));
    }
  }, [visible, assignedServiceIds]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selected));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <MotiFadeIn>
            <View className="bg-background rounded-t-3xl max-h-[80vh] min-h-[50vh]">
              <View className="px-5 pt-5 pb-3 border-b border-border">
                <View className="flex-row items-center justify-between">
                  <AppText variant="heading" className="text-xl">
                    {workerName} — Services
                  </AppText>
                  <HapticPressable
                    onPress={onClose}
                    className="w-8 h-8 rounded-full bg-secondary items-center justify-center"
                  >
                    <ThemedText className="text-foreground text-sm">✕</ThemedText>
                  </HapticPressable>
                </View>
              </View>

              <ScrollView className="px-5 pt-4" contentContainerStyle={{ paddingBottom: 24, gap: 12 }}>
                <AppText variant="caption" className="text-muted-foreground">
                  Select which services this worker can perform.
                </AppText>

                {loading ? (
                  <ActivityIndicator color={COLORS.primary} className="py-8" />
                ) : allServices.length === 0 ? (
                  <EmptyState
                    icon={<Scissors size={48} color={COLORS.mutedForeground} />}
                    title="No services found"
                    description="Add services first."
                  />
                ) : (
                  allServices.map((s) => {
                    const isSelected = selected.has(s.id);
                    return (
                      <HapticPressable
                        key={s.id}
                        className={`flex-row items-center gap-3 rounded-xl border p-4 ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                        onPress={() => toggle(s.id)}
                      >
                        <View
                          className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                          }`}
                        >
                          {isSelected && <View className="w-2 h-2 rounded-full bg-primary-foreground" />}
                        </View>
                        <View className="flex-1">
                          <ThemedText className="font-body font-medium text-foreground">
                            {s.name}
                          </ThemedText>
                          <ThemedText className="font-body text-sm text-muted-foreground">
                            Rs {s.price_pkr} · {s.duration_minutes}min
                          </ThemedText>
                        </View>
                      </HapticPressable>
                    );
                  })
                )}

                <View className="pt-4">
                  <PrimaryButton loading={saving} onPress={handleSave} className="w-full">
                    <ThemedText className="font-body font-semibold text-primary-foreground">
                      Save ({selected.size} selected)
                    </ThemedText>
                  </PrimaryButton>
                </View>
              </ScrollView>
            </View>
          </MotiFadeIn>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
