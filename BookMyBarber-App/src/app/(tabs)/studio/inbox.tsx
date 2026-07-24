import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, TextInput, Modal, RefreshControl, useColorScheme } from 'react-native';
import { Inbox as InboxIcon } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui/haptic-pressable';
import { EmptyState } from '@/components/ui/empty-state';
import { AppText } from '@/components/ui/app-text';
import { useBarberStudio } from '@/contexts/barber-studio';
import { useSystemBars } from '@/hooks/use-system-bars';
import { appAlert } from '@/lib/app-alert';
import { formatApiError } from '@/lib/network-error';
import { approveBooking, fetchShopBookings, rejectBooking } from '@/lib/bookings';
import { COLORS } from '@/constants/design-tokens';
import { btn, input } from '@/constants/ui-classes';

interface BarberBooking {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  payment_status: string;
  price_pkr: number;
  requested_duration_minutes?: number | null;
  final_duration_minutes?: number | null;
  profiles?: { name?: string } | null;
  shop_services?: { name?: string } | null;
}

export default function InboxPage() {
  const scheme = useColorScheme();
  const { selectedShopId } = useBarberStudio();

  const [bookings, setBookings] = useState<BarberBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [approveTarget, setApproveTarget] = useState<BarberBooking | null>(null);
  const [finalDuration, setFinalDuration] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  useSystemBars({
    statusBarStyle: approveTarget ? 'light' : scheme === 'dark' ? 'light' : 'dark',
    navigationBarStyle: scheme === 'dark' ? 'light' : 'dark',
  });

  const loadBookings = useCallback(async () => {
    if (!selectedShopId) return;
    setLoading(true);
    try {
      const data = await fetchShopBookings(selectedShopId);
      setBookings(data as unknown as BarberBooking[]);
    } catch (err) {
      appAlert('Load failed', formatApiError(err, 'Could not load bookings'), undefined, {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedShopId]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (selectedShopId) {
        const data = await fetchShopBookings(selectedShopId);
        setBookings(data as unknown as BarberBooking[]);
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedShopId]);

  const handleApprove = async () => {
    if (!approveTarget || !selectedShopId) return;
    try {
      await approveBooking(approveTarget.id, {
        finalDurationMinutes: Number(finalDuration) || undefined,
        finalPricePkr: Number(finalPrice) || undefined,
        barberNotes: approveNotes || undefined,
      });
      setApproveTarget(null);
      await loadBookings();
    } catch (err) {
      appAlert('Approve failed', formatApiError(err, 'Try again'), undefined, {
        variant: 'error',
      });
    }
  };

  const handleReject = async (bookingId: string) => {
    if (!selectedShopId) return;
    try {
      await rejectBooking(bookingId);
      await loadBookings();
    } catch (err) {
      appAlert('Reject failed', formatApiError(err, 'Try again'), undefined, {
        variant: 'error',
      });
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pt-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
      }
    >
      <AppText variant="heading" className="text-lg mb-3">Booking Inbox</AppText>

      {loading ? (
        <View className="gap-3">
          {[1, 2, 3].map((i) => (
            <View key={i} className="bg-card border border-border rounded-xl p-4">
              <View className="h-4 bg-muted/50 rounded w-2/3" />
              <View className="h-3 bg-muted/50 rounded w-1/2 mt-2" />
              <View className="h-8 bg-muted/50 rounded w-full mt-3" />
            </View>
          ))}
        </View>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<InboxIcon size={48} color={COLORS.mutedForeground} />}
          title="No bookings yet"
        />
      ) : (
        <View className="gap-3">
          {bookings.map((b) => (
            <View key={b.id} className="bg-card border border-border rounded-xl p-4">
              <ThemedText selectable>
                {b.profiles?.name ?? 'Customer'} — {b.booking_date}{' '}
                {String(b.start_time).slice(0, 5)}
              </ThemedText>
              <ThemedText selectable className="text-muted-foreground">
                {b.shop_services?.name ?? 'Service'} · {b.status} · {b.payment_status} · Rs{' '}
                {b.price_pkr}
              </ThemedText>
              {b.status === 'pending' ? (
                <View className="mt-2 flex-row gap-2">
                  <HapticPressable
                    className={`${btn.primary} flex-1`}
                    onPress={() => {
                      setApproveTarget(b);
                      setFinalDuration(
                        String(b.requested_duration_minutes ?? b.final_duration_minutes ?? 30),
                      );
                      setFinalPrice(String(b.price_pkr ?? ''));
                      setApproveNotes('');
                    }}
                  >
                    <ThemedText className={btn.primaryText}>Approve</ThemedText>
                  </HapticPressable>
                  <HapticPressable
                    className="flex-1 border border-destructive rounded-xl px-3 py-3"
                    onPress={() => void handleReject(b.id)}
                  >
                    <ThemedText className="font-body text-destructive text-center">
                      Reject
                    </ThemedText>
                  </HapticPressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={!!approveTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setApproveTarget(null)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="gap-3 rounded-t-2xl bg-card p-6">
            <ThemedText type="subtitle">Confirm booking</ThemedText>
            <AppText variant="label">FINAL DURATION (MIN)</AppText>
            <TextInput
              className={input.base}
              placeholder="e.g. 30"
              placeholderTextColor={COLORS.mutedForeground}
              keyboardType="numeric"
              value={finalDuration}
              onChangeText={setFinalDuration}
            />
            <AppText variant="label">FINAL PRICE (PKR)</AppText>
            <TextInput
              className={input.base}
              placeholder="e.g. 500"
              placeholderTextColor={COLORS.mutedForeground}
              keyboardType="numeric"
              value={finalPrice}
              onChangeText={setFinalPrice}
            />
            <AppText variant="label">NOTES TO CUSTOMER (OPTIONAL)</AppText>
            <TextInput
              className={input.base}
              placeholder="Add a note for the customer"
              placeholderTextColor={COLORS.mutedForeground}
              value={approveNotes}
              onChangeText={setApproveNotes}
              multiline
            />
            <View className="mt-2 flex-row gap-2">
              <HapticPressable
                className={`${btn.secondary} flex-1`}
                onPress={() => setApproveTarget(null)}
              >
                <ThemedText className={`${btn.secondaryText} text-center`}>Cancel</ThemedText>
              </HapticPressable>
              <HapticPressable
                className={`${btn.primary} flex-1`}
                onPress={() => void handleApprove()}
              >
                <ThemedText className={`${btn.primaryText} text-center`}>
                  Confirm approve
                </ThemedText>
              </HapticPressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
