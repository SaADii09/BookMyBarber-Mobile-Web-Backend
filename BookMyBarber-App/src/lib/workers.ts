import { api } from './api';

export interface WorkerFormData {
  name: string;
  phone?: string;
  specialties?: string; // comma-separated
  avatarUrl?: string;
  instagramHandle?: string;
}

function toApiBody(data: WorkerFormData) {
  return {
    name: data.name,
    phone: data.phone || undefined,
    specialties: data.specialties
      ? data.specialties.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    avatarUrl: data.avatarUrl || undefined,
    instagramHandle: data.instagramHandle || undefined,
  };
}

export async function fetchWorkers(shopId: string) {
  const { data } = await api.get(`/app/shops/${shopId}/workers`);
  return data.workers as Record<string, unknown>[];
}

export async function createWorker(shopId: string, body: WorkerFormData) {
  const { data } = await api.post(`/app/shops/${shopId}/workers`, toApiBody(body));
  return data.worker as Record<string, unknown>;
}

export async function updateWorker(
  shopId: string,
  workerId: string,
  body: Partial<WorkerFormData> & { isActive?: boolean }
) {
  const apiBody: Record<string, unknown> = {};
  if (body.name !== undefined) apiBody.name = body.name;
  if (body.phone !== undefined) apiBody.phone = body.phone || null;
  if (body.specialties !== undefined) {
    apiBody.specialties = body.specialties
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  if (body.avatarUrl !== undefined) apiBody.avatar_url = body.avatarUrl || null;
  if (body.instagramHandle !== undefined) apiBody.instagram_handle = body.instagramHandle || null;
  if (body.isActive !== undefined) apiBody.is_active = body.isActive;

  const { data } = await api.patch(`/app/shops/${shopId}/workers/${workerId}`, apiBody);
  return data.worker as Record<string, unknown>;
}

export async function deleteWorker(shopId: string, workerId: string) {
  await api.delete(`/app/shops/${shopId}/workers/${workerId}`);
}
