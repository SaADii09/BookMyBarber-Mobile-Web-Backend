import { api } from './api';
import type { CustomerBookingRow, ShopDetailResponse } from './booking-types';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export async function fetchShopDetail(shopId: string): Promise<ShopDetailResponse> {
  const { data } = await api.get(`/app/shops/${shopId}`);
  return data as ShopDetailResponse;
}

export async function fetchSlots(
  shopId: string,
  params: {
    date: string;
    serviceId: string;
    workerId?: string;
    durationMinutes?: number;
  }
) {
  const { data } = await api.get(`/app/shops/${shopId}/slots`, { params });
  return data as { slots: TimeSlot[]; durationMinutes: number; pricePkr: number };
}

export async function createBooking(body: {
  shopId: string;
  serviceId: string;
  workerId?: string;
  bookingDate: string;
  startTime: string;
  requestedDurationMinutes?: number;
  requestedPricePkr?: number;
  customerNotes?: string;
}) {
  const { data } = await api.post('/app/bookings', body);
  return data.booking as CustomerBookingRow & { id: string; price_pkr: number };
}

export async function fetchMyBookings(): Promise<CustomerBookingRow[]> {
  const { data } = await api.get('/app/bookings/mine');
  return data.bookings as CustomerBookingRow[];
}

export async function fetchShopBookings(shopId: string) {
  const { data } = await api.get(`/app/bookings/shop/${shopId}`);
  return data.bookings as Record<string, unknown>[];
}

export async function approveBooking(
  id: string,
  body?: { finalDurationMinutes?: number; finalPricePkr?: number; barberNotes?: string }
) {
  const { data } = await api.patch(`/app/bookings/${id}/approve`, body);
  return data.booking;
}

export async function rejectBooking(id: string, barberNotes?: string) {
  const { data } = await api.patch(`/app/bookings/${id}/reject`, { barberNotes });
  return data.booking;
}

export async function cancelBooking(id: string) {
  const { data } = await api.patch(`/app/bookings/${id}/cancel`);
  return data.booking as CustomerBookingRow;
}
