import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuthSession } from '@/contexts/auth-session';
import type { CustomerBookingRow } from '@/lib/booking-types';
import type { CustomerBookingsQuery } from '@/lib/bookings';
import { cancelBooking as cancelBookingApi, fetchMyBookings } from '@/lib/bookings';

export type BookingTab = 'upcoming' | 'history';
export type BookingFilter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'paid'
  | 'unpaid';

export const UPCOMING_FILTERS: BookingFilter[] = [
  'all',
  'pending',
  'approved',
  'unpaid',
];

export const HISTORY_FILTERS: BookingFilter[] = [
  'all',
  'completed',
  'cancelled',
  'rejected',
  'paid',
];

function buildQuery(
  tab: BookingTab,
  filter: BookingFilter,
): CustomerBookingsQuery {
  const isUp = tab === 'upcoming';
  switch (filter) {
    case 'all':
      return { status: isUp ? 'pending,approved' : 'completed,cancelled,rejected' };
    case 'pending':
      return { status: 'pending' };
    case 'approved':
      return { status: 'approved' };
    case 'completed':
      return { status: 'completed' };
    case 'cancelled':
      return { status: 'cancelled' };
    case 'rejected':
      return { status: 'rejected' };
    case 'paid':
      return {
        status: isUp ? 'pending,approved' : 'completed,cancelled,rejected',
        paymentStatus: 'paid',
      };
    case 'unpaid':
      return {
        status: isUp ? 'pending,approved' : 'completed,cancelled,rejected',
        paymentStatus: 'unpaid',
      };
  }
}

export function useBookings() {
  const { signOut, status: authStatus, user } = useAuthSession();
  const [visible, setVisible] = useState<CustomerBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BookingTab>('upcoming');
  const [activeFilter, setActiveFilter] = useState<BookingFilter>('all');

  const queryParams = useMemo(
    () => buildQuery(activeTab, activeFilter),
    [activeTab, activeFilter],
  );

  const load = useCallback(
    async (silent = false) => {
      if (authStatus !== 'authenticated' || user?.role !== 'customer') {
        setVisible([]);
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      setError(null);
      try {
        setVisible(await fetchMyBookings(queryParams));
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          await signOut();
          return;
        }
        setVisible([]);
        setError('Could not load bookings. Pull to refresh.');
      } finally {
        setLoading(false);
      }
    },
    [authStatus, user?.role, signOut, queryParams],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleTabChange = useCallback((tab: BookingTab) => {
    setActiveTab(tab);
    setActiveFilter('all');
  }, []);

  const cancelOne = useCallback(
    async (id: string) => {
      setCancellingId(id);
      try {
        await cancelBookingApi(id);
        await load(true);
      } catch (e) {
        throw e;
      } finally {
        setCancellingId(null);
      }
    },
    [load],
  );

  const refresh = useCallback(() => load(false), [load]);

  return {
    visible,
    loading,
    error,
    cancellingId,
    activeTab,
    activeFilter,
    setActiveTab: handleTabChange,
    setActiveFilter,
    cancelBooking: cancelOne,
    refresh,
  };
}
