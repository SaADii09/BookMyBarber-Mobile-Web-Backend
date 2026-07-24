import { api } from "./api";
import type { WorkingHoursRow } from "./booking-types";

export interface WorkingHourDay {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export async function fetchWorkingHours(shopId: string): Promise<WorkingHoursRow[]> {
  const { data } = await api.get(`/app/shops/${shopId}`);
  return (data.workingHours as WorkingHoursRow[]) || [];
}

export async function updateWorkingHours(
  shopId: string,
  hours: WorkingHourDay[]
): Promise<WorkingHoursRow[]> {
  const { data } = await api.put(`/app/shops/${shopId}/working-hours`, { hours });
  return (data.workingHours as WorkingHoursRow[]) || [];
}