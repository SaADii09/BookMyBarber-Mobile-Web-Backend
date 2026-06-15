import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import { ShopNavigationActions } from '@/components/booking/shop-navigation-actions';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui';
import { COLORS } from '@/constants/design-tokens';
import { btn, card, screen } from '@/constants/ui-classes';
import { useAuthSession } from '@/contexts/auth-session';
import { appAlert } from '@/lib/app-alert';
import type { CustomerBookingRow } from '@/lib/booking-types';
import { cancelBooking, fetchMyBookings } from '@/lib/bookings';
import { formatApiError } from '@/lib/network-error';

function canCancel(status: string): boolean {
  return status === 'pending' || status === 'approved';
}

function showNavActions(item: CustomerBookingRow): boolean {
  const shop = item.barber_shops;
  if (!shop) return false;
  return (
    item.status === 'approved' &&
    shop.latitude != null &&
    shop.longitude != null
  );
}

export default function BookingsScreen() {
  const { status, user, signOut } = useAuthSession();
  const [bookings, setBookings] = useState<CustomerBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState('No bookings yet');

  const load = useCallback(async () => {
    if (status !== 'authenticated') {
      setBookings([]);
      setLoading(false);
      return;
    }

    if (user?.role !== 'customer') {
      setBookings([]);
      setEmptyMessage(
        user?.role === 'admin'
          ? 'Admin bookings are managed in the web dashboard.'
          : 'Manage shop bookings in Studio (Home → Studio).'
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setBookings(await fetchMyBookings());
      setEmptyMessage('No bookings yet');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          await signOut();
          return;
        }
        if (err.response?.status === 403) {
          setBookings([]);
          setEmptyMessage('You do not have access to customer bookings on this account.');
          return;
        }
      }
      setBookings([]);
      setEmptyMessage('Could not load bookings. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  }, [status, user?.role, signOut]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = (id: string) => {
    appAlert('Cancel booking?', 'This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(id);
            await load();
          } catch (err) {
            appAlert('Cancel failed', formatApiError(err, 'Try again'));
          }
        },
      },
    ]);
  };

  return (
    <View className={screen.root}>
      <ThemedText type="subtitle" className="p-5">
        My Bookings
      </ThemedText>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} className="mt-10" />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="gap-3 p-5"
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" className="text-center">
              {emptyMessage}
            </ThemedText>
          }
          renderItem={({ item }) => {
            const shop = item.barber_shops;
            const serviceName = item.shop_services?.name ?? 'Service';
            return (
              <View className={card.base}>
                <ThemedText selectable className="font-body font-bold">
                  {shop?.name ?? 'Shop'}
                </ThemedText>
                <ThemedText selectable themeColor="textSecondary" className="mt-1">
                  {serviceName} · {item.booking_date} · {String(item.start_time).slice(0, 5)}
                  {item.workers?.name ? ` · ${item.workers.name}` : ''}
                </ThemedText>
                <ThemedText selectable className="mt-2 font-body text-primary">
                  {item.status} · {item.payment_status} · Rs {item.price_pkr}
                </ThemedText>

                {item.payment_status === 'unpaid' &&
                  (item.status === 'pending' || item.status === 'approved') ? (
                  <HapticPressable
                    haptic="medium"
                    className={`${btn.primary} mt-3`}
                    onPress={() =>
                      router.push({
                        pathname: '/checkout',
                        params: {
                          bookingId: item.id,
                          amountPkr: String(item.price_pkr),
                        },
                      })
                    }>
                    <ThemedText className={btn.primaryText}>Pay now</ThemedText>
                  </HapticPressable>
                ) : null}

                {showNavActions(item) && shop ? (
                  <View className="mt-3">
                    <ShopNavigationActions
                      compact
                      shop={{
                        name: shop.name,
                        address: shop.address,
                        latitude: shop.latitude,
                        longitude: shop.longitude,
                      }}
                    />
                  </View>
                ) : null}

                {canCancel(item.status) ? (
                  <HapticPressable
                    className={`${btn.secondary} mt-2 border-destructive`}
                    onPress={() => handleCancel(item.id)}>
                    <ThemedText className="font-body text-destructive">Cancel booking</ThemedText>
                  </HapticPressable>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
