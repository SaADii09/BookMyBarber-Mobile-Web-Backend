import { api } from "./api";
import type { ShopServiceRow } from "./booking-types";

export interface ServiceFormData {
  name: string;
  description?: string | null;
  durationMinutes: number;
  pricePkr: number;
}

export async function fetchServices(shopId: string): Promise<ShopServiceRow[]> {
  const { data } = await api.get(`/app/shops/${shopId}/services`);
  return data.services as ShopServiceRow[];
}

export async function createService(
  shopId: string,
  body: ServiceFormData
): Promise<ShopServiceRow> {
  const { data } = await api.post(`/app/shops/${shopId}/services`, body);
  return data.service as ShopServiceRow;
}

export async function updateService(
  shopId: string,
  serviceId: string,
  body: Partial<ServiceFormData> & { isActive?: boolean }
): Promise<ShopServiceRow> {
  const { data } = await api.patch(`/app/shops/${shopId}/services/${serviceId}`, body);
  return data.service as ShopServiceRow;
}

export async function deleteService(shopId: string, serviceId: string): Promise<void> {
  await api.delete(`/app/shops/${shopId}/services/${serviceId}`);
}