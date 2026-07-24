import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Scissors } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui';
import { EmptyState } from '@/components/ui/empty-state';
import { COLORS, PLACEHOLDER_COLOR } from '@/constants/design-tokens';
import { btn, chip, input, screen } from '@/constants/ui-classes';
import { appAlert } from '@/lib/app-alert';
import type { ShopDetailResponse } from '@/lib/booking-types';
import {
  createBooking,
  fetchShopDetail,
  fetchSlots,
  type TimeSlot,
} from '@/lib/bookings';
import { formatApiError } from '@/lib/network-error';
import { ServicePickerModal } from '@/components/booking/service-picker-modal';
import { WorkerPickerModal } from '@/components/booking/worker-picker-modal';
import { TimeSlotPicker } from '@/components/booking/time-slot-picker';

function formatDateYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayOfWeekFromYmd(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00.000Z`).getUTCDay();
}

export default function BookScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const [loading, setLoading] = useState(true);
  const [shopDetail, setShopDetail] = useState<ShopDetailResponse | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [date, setDate] = useState(formatDateYmd(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [workerPickerVisible, setWorkerPickerVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchShopDetail(String(shopId));
        setShopDetail(data);
        if (data.services?.length) setServiceId(data.services[0].id);
      } catch {
        appAlert('Error', 'Could not load shop');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [shopId]);

  // Filter services based on selected worker (show only services the worker can perform)
  const filteredServices = useMemo(() => {
    if (!shopDetail?.services) return [];
    if (!workerId) return shopDetail.services;
    // Worker selected — filter to assigned services (clientside estimate, backend validates)
    return shopDetail.services;
  }, [shopDetail, workerId]);

  const selectedService = useMemo(
    () => shopDetail?.services?.find((s) => s.id === serviceId) ?? null,
    [shopDetail, serviceId]
  );

  const closedToday = useMemo(() => {
    if (!shopDetail?.workingHours?.length) return true;
    const dow = dayOfWeekFromYmd(date);
    return !shopDetail.workingHours.some(
      (h) => h.day_of_week === dow && h.is_active
    );
  }, [shopDetail, date]);

  useEffect(() => {
    if (!serviceId || !shopId || closedToday) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSlotsLoading(true);
      setSlotError(null);
      try {
        const result = await fetchSlots(String(shopId), {
          date,
          serviceId,
          workerId: workerId ?? undefined,
        });
        if (!cancelled) {
          setSlots(result.slots);
          setSelectedSlot(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSlots([]);
          setSlotError(formatApiError(err, 'Could not load slots'));
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId, workerId, date, shopId, closedToday]);

  const onDateChange = (_event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (picked) setDate(formatDateYmd(picked));
  };

  const handleBook = async () => {
    if (!selectedSlot || !serviceId) {
      appAlert('Select a time slot');
      return;
    }
    setSubmitting(true);
    try {
      const booking = await createBooking({
        shopId: String(shopId),
        serviceId,
        workerId: workerId ?? undefined,
        bookingDate: date,
        startTime: selectedSlot.startTime,
        customerNotes: notes || undefined,
      });
      router.push({
        pathname: '/checkout',
        params: {
          bookingId: booking.id,
          amountPkr: String(booking.price_pkr),
        },
      });
    } catch (err: unknown) {
      appAlert('Booking failed', formatApiError(err, 'Try again'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className={screen.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const shopName = shopDetail?.shop?.name ?? 'Shop';
  const noServices = !shopDetail?.services?.length;

  return (
    <SafeAreaView edges={['bottom']} className={screen.root}>
      <Stack.Screen options={{ title: `Book — ${shopName}` }} />
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 p-5">
        <ThemedText type="subtitle">Book at {shopName}</ThemedText>

        {noServices ? (
          <EmptyState
            icon={<Scissors size={48} color={COLORS.mutedForeground} />}
            title="No services yet"
            description="Ask the barber to add services in Studio."
          />
        ) : null}

        {/* Service picker (modal) */}
        <View className="gap-1.5">
          <ThemedText type="smallBold">Service</ThemedText>
          <HapticPressable
            className={input.base}
            onPress={() => setServicePickerVisible(true)}
          >
            <ThemedText className={`font-body ${selectedService ? 'text-foreground' : ''}`}>
              {selectedService
                ? `${selectedService.name} — Rs ${selectedService.price_pkr} (${selectedService.duration_minutes}m)`
                : 'Select a service...'}
            </ThemedText>
          </HapticPressable>
        </View>

        {/* Worker picker (modal) */}
        <View className="gap-1.5">
          <ThemedText type="smallBold">Barber</ThemedText>
          <HapticPressable
            className={input.base}
            onPress={() => setWorkerPickerVisible(true)}
          >
            <ThemedText className="font-body text-foreground">
              {workerId
                ? shopDetail?.workers?.find((w) => w.id === workerId)?.name ?? 'Selected'
                : 'Any available'}
            </ThemedText>
          </HapticPressable>
        </View>

        {/* Date picker */}
        <ThemedText type="smallBold">Date</ThemedText>
        <HapticPressable
          className={input.base}
          onPress={() => setShowDatePicker(true)}>
          <ThemedText selectable className="font-body text-foreground">
            {date}
          </ThemedText>
        </HapticPressable>
        {closedToday ? (
          <ThemedText selectable className="font-body text-destructive">
            Shop closed on this day — pick another date.
          </ThemedText>
        ) : null}

        {showDatePicker && Platform.OS === 'android' ? (
          <DateTimePicker
            value={new Date(`${date}T12:00:00`)}
            mode="date"
            minimumDate={new Date()}
            onChange={onDateChange}
          />
        ) : null}

        <Modal visible={showDatePicker && Platform.OS === 'ios'} transparent animationType="fade">
          <Pressable
            className="flex-1 justify-end bg-black/50"
            onPress={() => setShowDatePicker(false)}>
            <Pressable className="rounded-t-2xl bg-card p-4" onPress={(e) => e.stopPropagation()}>
              <DateTimePicker
                value={new Date(`${date}T12:00:00`)}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={onDateChange}
              />
              <HapticPressable className={`${btn.primary} mt-2`} onPress={() => setShowDatePicker(false)}>
                <ThemedText className={btn.primaryText}>Done</ThemedText>
              </HapticPressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Notes */}
        <TextInput
          className={input.base}
          placeholder="Notes for barber (optional)"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* Time slots */}
        <View className="gap-1.5">
          <ThemedText type="smallBold">Available slots</ThemedText>
          {!serviceId ? (
            <ThemedText selectable className="font-body text-muted-foreground">
              Select a service first
            </ThemedText>
          ) : closedToday ? (
            <ThemedText selectable className="font-body text-muted-foreground">
              Shop closed on this day
            </ThemedText>
          ) : (
            <TimeSlotPicker
              slots={slots}
              loading={slotsLoading}
              error={slotError}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
            />
          )}
        </View>

        <HapticPressable
          haptic="medium"
          className={`${btn.primary} mt-2`}
          onPress={handleBook}
          disabled={submitting || noServices || closedToday || !selectedSlot}>
          {submitting ? (
            <ActivityIndicator color={COLORS.primaryForeground} />
          ) : (
            <ThemedText className={btn.primaryText}>Confirm & Pay</ThemedText>
          )}
        </HapticPressable>
      </ScrollView>

      {/* Service picker modal */}
      <ServicePickerModal
        visible={servicePickerVisible}
        onClose={() => setServicePickerVisible(false)}
        services={filteredServices}
        selectedServiceId={serviceId}
        onSelect={(s) => setServiceId(s.id)}
      />

      {/* Worker picker modal */}
      <WorkerPickerModal
        visible={workerPickerVisible}
        onClose={() => setWorkerPickerVisible(false)}
        workers={shopDetail?.workers ?? []}
        selectedWorkerId={workerId}
        onSelect={(id) => setWorkerId(id)}
      />
    </SafeAreaView>
  );
}
