import { useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Clock } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui/haptic-pressable';
import { EmptyState } from '@/components/ui/empty-state';
import { MotiFadeIn } from '@/components/ui/moti-fade-in';
import { chip } from '@/constants/ui-classes';
import { COLORS } from '@/constants/design-tokens';
import type { TimeSlot } from '@/lib/bookings';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  loading: boolean;
  error: string | null;
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
}

type TimeGroup = 'morning' | 'afternoon' | 'evening';

function getTimeGroup(startTime: string): TimeGroup {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const GROUP_LABELS: Record<TimeGroup, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

const GROUP_ORDER: TimeGroup[] = ['morning', 'afternoon', 'evening'];

export function TimeSlotPicker({
  slots,
  loading,
  error,
  selectedSlot,
  onSelect,
}: TimeSlotPickerProps) {
  const grouped = useMemo(() => {
    const map: Record<TimeGroup, TimeSlot[]> = { morning: [], afternoon: [], evening: [] };
    for (const s of slots) {
      const group = getTimeGroup(s.startTime);
      map[group].push(s);
    }
    return map;
  }, [slots]);

  if (loading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <ThemedText selectable className="font-body text-destructive">
        {error}
      </ThemedText>
    );
  }

  if (slots.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={48} color={COLORS.mutedForeground} />}
        title="No slots available for this date"
      />
    );
  }

  return (
    <View className="gap-4">
      {GROUP_ORDER.map((group) => {
        const groupSlots = grouped[group];
        if (groupSlots.length === 0) return null;
        return (
          <MotiFadeIn key={group} transition={{ type: 'timing', duration: 200 }}>
            <View className="gap-2">
              <ThemedText className="font-body font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                {GROUP_LABELS[group]}
              </ThemedText>
              <View className="flex-row flex-wrap gap-2">
                {groupSlots.map((slot) => {
                  const isSelected =
                    selectedSlot?.startTime === slot.startTime &&
                    selectedSlot?.endTime === slot.endTime;
                  return (
                    <HapticPressable
                      key={`${slot.startTime}-${slot.endTime}`}
                      className={`${chip.base} ${isSelected ? chip.active : ''} flex-row items-center gap-1.5`}
                      onPress={() => onSelect(slot)}
                    >
                      {isSelected && (
                        <ThemedText className="text-primary text-xs">✓</ThemedText>
                      )}
                      <ThemedText className={chip.text}>
                        {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
                      </ThemedText>
                    </HapticPressable>
                  );
                })}
              </View>
            </View>
          </MotiFadeIn>
        );
      })}
    </View>
  );
}
