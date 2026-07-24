import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ShopNavigationActions } from '@/components/booking/shop-navigation-actions';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable, MotiFadeIn } from '@/components/ui';
import { COLORS } from '@/constants/design-tokens';
import { btn, card, screen } from '@/constants/ui-classes';
import { appAlert } from '@/lib/app-alert';
import type { CustomerBookingRow } from '@/lib/booking-types';
import { formatApiError } from '@/lib/network-error';
import {
  useBookings,
  type BookingFilter,
  UPCOMING_FILTERS,
  HISTORY_FILTERS,
} from '@/hooks/use-bookings';

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

function filterLabel(f: BookingFilter): string {
  if (f === 'all') return 'All';
  return f.charAt(0).toUpperCase() + f.slice(1);
}

export default function BookingsScreen() {
  const {
    visible,
    loading,
    error,
    cancellingId,
    activeTab,
    activeFilter,
    setActiveTab,
    setActiveFilter,
    cancelBooking,
    refresh,
  } = useBookings();

  const filters =
    activeTab === 'upcoming' ? UPCOMING_FILTERS : HISTORY_FILTERS;

  const handleCancel = useCallback(
    (id: string) => {
      if (cancellingId) return;
      appAlert('Cancel booking?', 'This cannot be undone.', [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(id);
            } catch (err) {
              appAlert('Cancel failed', formatApiError(err, 'Try again'));
            }
          },
        },
      ]);
    },
    [cancelBooking, cancellingId],
  );

  const renderBooking = useCallback(
    ({ item }: { item: CustomerBookingRow }) => {
      const shop = item.barber_shops;
      const serviceName = item.shop_services?.name ?? 'Service';
      const isCancelling = cancellingId === item.id;

      return (
        <MotiFadeIn>
          <View className={card.base}>
            <ThemedText selectable className="font-body font-bold">
              {shop?.name ?? 'Shop'}
            </ThemedText>
            <ThemedText selectable themeColor="textSecondary" className="mt-1">
              {serviceName} · {item.booking_date} ·{' '}
              {String(item.start_time).slice(0, 5)}
              {item.workers?.name ? ` · ${item.workers.name}` : ''}
            </ThemedText>
            <ThemedText
              selectable
              className="mt-2 font-body text-primary">
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
                className={`${btn.secondary} mt-2 border-destructive${isCancelling ? ' opacity-50' : ''}`}
                disabled={isCancelling}
                onPress={() => handleCancel(item.id)}>
                {isCancelling ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <ThemedText className="font-body text-destructive">
                    Cancel booking
                  </ThemedText>
                )}
              </HapticPressable>
            ) : null}
          </View>
        </MotiFadeIn>
      );
    },
    [cancellingId, handleCancel],
  );

  const emptyMessage = (() => {
    if (error) return error;
    if (activeFilter !== 'all') return 'No bookings match this filter.';
    if (activeTab === 'upcoming') return 'No upcoming bookings.';
    return 'No booking history.';
  })();

  return (
    <SafeAreaView className={screen.root}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading && visible.length > 0}
            onRefresh={refresh}
          />
        }
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="p-5 pb-8 grow"
        ListHeaderComponent={
          <>
            <ThemedText type="subtitle" className="mb-4">
              My Bookings
            </ThemedText>

            {/* ---- Segmented control ---- */}
            <View className="flex-row bg-muted rounded-xl p-1 mb-4">
              <HapticPressable
                haptic="light"
                className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'upcoming' ? 'bg-primary' : ''}`}
                onPress={() => setActiveTab('upcoming')}>
                <ThemedText
                  className={`font-body font-semibold text-sm ${activeTab === 'upcoming' ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                  Upcoming
                </ThemedText>
              </HapticPressable>
              <HapticPressable
                haptic="light"
                className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'history' ? 'bg-primary' : ''}`}
                onPress={() => setActiveTab('history')}>
                <ThemedText
                  className={`font-body font-semibold text-sm ${activeTab === 'history' ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                  History
                </ThemedText>
              </HapticPressable>
            </View>

            {/* ---- Filter chips ---- */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4">
              <View className="flex-row gap-2">
                {filters.map((f) => (
                  <HapticPressable
                    key={f}
                    haptic="light"
                    className={`px-4 py-2 rounded-full ${activeFilter === f ? 'bg-primary' : 'bg-card border border-border'}`}
                    onPress={() => setActiveFilter(f)}>
                    <ThemedText
                      className={`font-body text-sm ${activeFilter === f ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                      {filterLabel(f)}
                    </ThemedText>
                  </HapticPressable>
                ))}
              </View>
            </ScrollView>

            {/* ---- Inline loading (tab/filter switch with existing data) ---- */}
            {loading && visible.length > 0 ? (
              <ActivityIndicator color={COLORS.primary} size="small" className="py-2" />
            ) : null}
          </>
        }
        ListEmptyComponent={
          loading && visible.length === 0 ? (
            <ActivityIndicator color={COLORS.primary} className="mt-10" />
          ) : (
            <ThemedText
              themeColor="textSecondary"
              className="text-center px-5 mt-8">
              {emptyMessage}
            </ThemedText>
          )
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={renderBooking}
      />
    </SafeAreaView>
  );
}
