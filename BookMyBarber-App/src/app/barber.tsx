import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui';
import { COLORS, PLACEHOLDER_COLOR } from '@/constants/design-tokens';
import { btn, card, chip, input, screen } from '@/constants/ui-classes';
import { appAlert } from '@/lib/app-alert';
import { api } from '@/lib/api';
import { approveBooking, fetchShopBookings, rejectBooking } from '@/lib/bookings';
import { formatApiError } from '@/lib/network-error';

export default function BarberScreen() {
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [svcName, setSvcName] = useState('');
  const [svcDuration, setSvcDuration] = useState('30');
  const [svcPrice, setSvcPrice] = useState('500');
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [finalDuration, setFinalDuration] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  const loadShops = async () => {
    const { data } = await api.get('/app/shops/my');
    setShops(data.shops || []);
    if (data.shops?.length && !selectedShop) setSelectedShop(data.shops[0].id);
  };

  const loadShopData = async (shopId: string) => {
    const [bk, detail] = await Promise.all([
      fetchShopBookings(shopId),
      api.get(`/app/shops/${shopId}`),
    ]);
    setBookings(bk);
    setServices(detail.data.services || []);
  };

  useEffect(() => {
    loadShops().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedShop) loadShopData(selectedShop);
  }, [selectedShop]);

  const addService = async () => {
    if (!selectedShop) return;
    await api.post(`/app/shops/${selectedShop}/services`, {
      name: svcName,
      durationMinutes: Number(svcDuration),
      pricePkr: Number(svcPrice),
    });
    setSvcName('');
    loadShopData(selectedShop);
  };

  const saveHours = async () => {
    if (!selectedShop) return;
    const hours = [1, 2, 3, 4, 5, 6].map((d) => ({
      dayOfWeek: d,
      startTime: '09:00:00',
      endTime: '20:00:00',
      isActive: true,
    }));
    await api.put(`/app/shops/${selectedShop}/working-hours`, { hours });
    appAlert('Hours saved', 'Mon–Sat 9am–8pm', undefined, { variant: 'success' });
  };

  const connectCalendar = async (provider: 'google' | 'microsoft') => {
    const { data } = await api.get(`/calendar/${provider}/connect`);
    await WebBrowser.openBrowserAsync(data.authUrl);
    await api.post('/calendar/sync');
    appAlert('Calendar', 'Sync requested after OAuth');
  };

  if (loading) {
    return (
      <View className={screen.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className={screen.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 p-5">
        {shops.map((s) => (
          <HapticPressable
            key={s.id}
            className={`${chip.base} ${selectedShop === s.id ? chip.active : ''}`}
            onPress={() => setSelectedShop(s.id)}>
            <ThemedText className={chip.text}>{s.name}</ThemedText>
          </HapticPressable>
        ))}

        <ThemedText type="smallBold">Services</ThemedText>
        <TextInput
          className={input.base}
          placeholder="Service name"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={svcName}
          onChangeText={setSvcName}
        />
        <TextInput
          className={input.base}
          placeholder="Duration min"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={svcDuration}
          onChangeText={setSvcDuration}
          keyboardType="numeric"
        />
        <TextInput
          className={input.base}
          placeholder="Price PKR"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={svcPrice}
          onChangeText={setSvcPrice}
          keyboardType="numeric"
        />
        <HapticPressable className={btn.primary} onPress={addService}>
          <ThemedText className={btn.primaryText}>Add Service</ThemedText>
        </HapticPressable>
        {services.map((s) => (
          <ThemedText key={s.id} themeColor="textSecondary">
            {s.name} — Rs {s.price_pkr} / {s.duration_minutes}m
          </ThemedText>
        ))}

        <HapticPressable className={btn.secondary} onPress={saveHours}>
          <ThemedText className={btn.secondaryText}>Set default working hours</ThemedText>
        </HapticPressable>

        <HapticPressable className={btn.secondary} onPress={() => connectCalendar('google')}>
          <ThemedText className={btn.secondaryText}>Connect Google Calendar</ThemedText>
        </HapticPressable>
        <HapticPressable className={btn.secondary} onPress={() => connectCalendar('microsoft')}>
          <ThemedText className={btn.secondaryText}>Connect Microsoft Calendar</ThemedText>
        </HapticPressable>

        <ThemedText type="smallBold" className="mt-2">
          Booking inbox
        </ThemedText>
        {services.length === 0 ? (
          <ThemedText themeColor="textSecondary">
            Add at least one service so customers can book time slots.
          </ThemedText>
        ) : null}
        {bookings.length === 0 ? (
          <ThemedText themeColor="textSecondary">No bookings yet.</ThemedText>
        ) : null}
        {bookings.map((b) => (
          <View key={b.id as string} className={card.base}>
            <ThemedText selectable>
              {(b as { profiles?: { name?: string } }).profiles?.name ?? 'Customer'} —{' '}
              {String(b.booking_date)} {String(b.start_time).slice(0, 5)}
            </ThemedText>
            <ThemedText selectable themeColor="textSecondary">
              {(b as { shop_services?: { name?: string } }).shop_services?.name ?? 'Service'} ·{' '}
              {String(b.status)} · {String(b.payment_status)} · Rs {String(b.price_pkr)}
            </ThemedText>
            {b.status === 'pending' && (
              <View className="mt-2 flex-row gap-2">
                <HapticPressable
                  className={`${btn.primary} flex-1`}
                  onPress={() => {
                    setApproveTarget(b);
                    setFinalDuration(
                      String(b.requested_duration_minutes ?? b.final_duration_minutes ?? 30)
                    );
                    setFinalPrice(String(b.requested_price_pkr ?? b.price_pkr ?? ''));
                    setApproveNotes('');
                  }}>
                  <ThemedText className={btn.primaryText}>Approve</ThemedText>
                </HapticPressable>
                <HapticPressable
                  className={`${btn.secondary} flex-1 border-destructive`}
                  onPress={() =>
                    rejectBooking(b.id as string).then(() => {
                      if (selectedShop) void loadShopData(selectedShop);
                    })
                  }>
                  <ThemedText className="font-body text-destructive">Reject</ThemedText>
                </HapticPressable>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!approveTarget} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/70">
          <View className="gap-3 rounded-t-2xl bg-card p-6">
            <ThemedText type="subtitle">Confirm booking</ThemedText>
            <TextInput
              className={input.base}
              placeholder="Final duration (minutes)"
              placeholderTextColor={PLACEHOLDER_COLOR}
              keyboardType="numeric"
              value={finalDuration}
              onChangeText={setFinalDuration}
            />
            <TextInput
              className={input.base}
              placeholder="Final price PKR"
              placeholderTextColor={PLACEHOLDER_COLOR}
              keyboardType="numeric"
              value={finalPrice}
              onChangeText={setFinalPrice}
            />
            <TextInput
              className={input.base}
              placeholder="Notes to customer (optional)"
              placeholderTextColor={PLACEHOLDER_COLOR}
              value={approveNotes}
              onChangeText={setApproveNotes}
            />
            <View className="mt-2 flex-row gap-2">
              <HapticPressable className={`${btn.secondary} flex-1`} onPress={() => setApproveTarget(null)}>
                <ThemedText themeColor="textSecondary">Cancel</ThemedText>
              </HapticPressable>
              <HapticPressable
                haptic="medium"
                className={`${btn.primary} flex-1`}
                onPress={async () => {
                  if (!approveTarget) return;
                  try {
                    await approveBooking(approveTarget.id as string, {
                      finalDurationMinutes: Number(finalDuration),
                      finalPricePkr: Number(finalPrice),
                      barberNotes: approveNotes || undefined,
                    });
                    setApproveTarget(null);
                    if (selectedShop) void loadShopData(selectedShop);
                  } catch (err) {
                    appAlert('Approve failed', formatApiError(err, 'Try again'));
                  }
                }}>
                <ThemedText className={btn.primaryText}>Confirm approve</ThemedText>
              </HapticPressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
