import { api } from './api';
import type { WorkingHourDay } from './working-hours';

export async function fetchWorkerAvailability(shopId: string, workerId: string) {
  const { data } = await api.get(`/app/shops/${shopId}/workers/${workerId}/availability`);
  return data.availability as {
    id: string;
    worker_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
  }[];
}

export async function updateWorkerAvailability(
  shopId: string,
  workerId: string,
  hours: WorkingHourDay[]
) {
  const { data } = await api.put(`/app/shops/${shopId}/workers/${workerId}/availability`, { hours });
  return data.availability as {
    id: string;
    worker_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
  }[];
}
