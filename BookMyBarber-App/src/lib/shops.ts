import { api } from "./api";
import type { BarberShopRow, BarberShopSummary } from "./booking-types";

export type NearbyShopParams = {
  lat: number;
  lng: number;
  radiusKm?: number;
  query?: string;
  limit?: number;
};

export async function fetchMyShops(): Promise<BarberShopRow[]> {
  const { data } = await api.get('/app/shops/my');
  return data.shops as BarberShopRow[];
}

export async function fetchMyShopSummary(): Promise<BarberShopSummary[]> {
  const { data } = await api.get('/app/shops/my');
  return data.shops as BarberShopSummary[];
}

export async function getNearbyShops(params: NearbyShopParams) {
  const { data } = await api.get("/app/shops/nearby", { params });
  return data as {
    searchCenter: { lat: number; lng: number };
    radiusKm: number;
    shops: Record<string, any>[];
  };
}

export async function updateShopLocation(
  shopId: string,
  payload: {
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    businessPhone?: string | null;
    websiteUrl?: string | null;
  }
) {
  const { data } = await api.patch(`/app/shops/${shopId}/location`, payload);
  return data as { message: string; shop: Record<string, any> };
}

export async function reverseGeocode(lat: number, lng: number) {
  const { data } = await api.get("/app/geocode/reverse", { params: { lat, lng } });
  return data.result as {
    formattedAddress: string | null;
    city: string | null;
    lat: number | null;
    lng: number | null;
  };
}

export async function getRoutePath(params: {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
}) {
  const { data } = await api.get("/app/maps/route", { params });
  return data as {
    route: {
      distanceMeters: number;
      durationSeconds: number;
      points: { latitude: number; longitude: number }[];
    };
  };
}

export interface UpdateShopPayload {
  name?: string;
  description?: string | null;
  businessPhone?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
}

export async function updateShopDetails(
  shopId: string,
  payload: UpdateShopPayload,
) {
  const { data } = await api.patch(`/app/shops/${shopId}`, payload);
  return data as { message: string; shop: BarberShopRow };
}
