import { api } from './api';

export async function fetchWorkerServices(shopId: string, workerId: string) {
  const { data } = await api.get(`/app/shops/${shopId}/workers/${workerId}/services`);
  return data.services as { id: string; service_id: string }[];
}

export async function replaceWorkerServices(
  shopId: string,
  workerId: string,
  serviceIds: string[]
) {
  const { data } = await api.put(`/app/shops/${shopId}/workers/${workerId}/services`, { serviceIds });
  return data.services as { id: string; service_id: string }[];
}
