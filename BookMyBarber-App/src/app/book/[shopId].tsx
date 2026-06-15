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
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui';
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
  const [customDuration, setCustomDuration] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
          durationMinutes: customDuration ? Number(customDuration) : undefined,
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
  }, [serviceId, workerId, date, customDuration, shopId, closedToday]);

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
        requestedDurationMinutes: customDuration ? Number(customDuration) : undefined,
        requestedPricePkr: customPrice ? Number(customPrice) : undefined,
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
    <>
      <Stack.Screen options={{ title: `Book — ${shopName}` }} />
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 p-5">
        <ThemedText type="subtitle">Book at {shopName}</ThemedText>

        {noServices ? (
          <ThemedText selectable className="font-body text-muted-foreground">
            This shop has no services yet. Ask the barber to add services in Studio.
          </ThemedText>
        ) : null}

        <ThemedText type="smallBold">Service</ThemedText>
        {shopDetail?.services?.map((s) => (
          <HapticPressable
            key={s.id}
            className={`${chip.base} ${serviceId === s.id ? chip.active : ''}`}
            onPress={() => setServiceId(s.id)}>
            <ThemedText className={chip.text}>
              {s.name} — Rs {s.price_pkr} ({s.duration_minutes}m)
            </ThemedText>
          </HapticPressable>
        ))}

        <ThemedText type="smallBold">Specialist (optional)</ThemedText>
        <HapticPressable
          className={`${chip.base} ${!workerId ? chip.active : ''}`}
          onPress={() => setWorkerId(null)}>
          <ThemedText className={chip.text}>Any available</ThemedText>
        </HapticPressable>
        {shopDetail?.workers?.map((w) => (
          <HapticPressable
            key={w.id}
            className={`${chip.base} ${workerId === w.id ? chip.active : ''}`}
            onPress={() => setWorkerId(w.id)}>
            <ThemedText className={chip.text}>{w.name}</ThemedText>
          </HapticPressable>
        ))}

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

        <TextInput
          className={input.base}
          placeholder="Custom duration (minutes, optional)"
          placeholderTextColor={PLACEHOLDER_COLOR}
          keyboardType="numeric"
          value={customDuration}
          onChangeText={setCustomDuration}
        />
        <TextInput
          className={input.base}
          placeholder="Custom price PKR (optional)"
          placeholderTextColor={PLACEHOLDER_COLOR}
          keyboardType="numeric"
          value={customPrice}
          onChangeText={setCustomPrice}
        />
        <TextInput
          className={input.base}
          placeholder="Notes for barber"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={notes}
          onChangeText={setNotes}
        />

        <ThemedText type="smallBold">Available slots</ThemedText>
        {slotsLoading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : slotError ? (
          <ThemedText selectable className="font-body text-destructive">
            {slotError}
          </ThemedText>
        ) : slots.length === 0 ? (
          <ThemedText selectable themeColor="textSecondary">
            {closedToday ? 'Closed this day' : 'No slots for this date'}
          </ThemedText>
        ) : (
          slots.map((slot) => (
            <HapticPressable
              key={`${slot.startTime}-${slot.endTime}`}
              className={`${chip.base} ${selectedSlot === slot ? chip.active : ''}`}
              onPress={() => setSelectedSlot(slot)}>
              <ThemedText className={chip.text}>
                {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
              </ThemedText>
            </HapticPressable>
          ))
        )}

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
    </>
  );
}
