import { api } from './api';

export const PROFILE_CITIES = ['Gujranwala', 'Lahore', 'Vehari'] as const;
export type ProfileCity = (typeof PROFILE_CITIES)[number];

export type AppProfileRole = 'customer' | 'barber' | 'admin';

export interface AppProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: AppProfileRole;
  city: ProfileCity;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  city?: ProfileCity;
  avatarUrl?: string;
}

export async function fetchProfile(): Promise<AppProfile> {
  const { data } = await api.get<{ profile: AppProfile }>('/app/profile');
  return data.profile;
}

export async function updateProfile(input: UpdateProfileInput): Promise<AppProfile> {
  const { data } = await api.put<{ profile: AppProfile }>('/app/profile', input);
  return data.profile;
}
