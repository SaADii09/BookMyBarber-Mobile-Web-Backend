import { api } from './api';

export async function forgotPassword(email: string): Promise<{ sent: boolean }> {
  const { data } = await api.post<{ sent: boolean }>('/auth/forgot-password', { email });
  return data;
}

export async function verifyResetCode(
  email: string,
  code: string
): Promise<{ resetToken: string }> {
  const { data } = await api.post<{ resetToken: string }>('/auth/verify-reset-code', {
    email,
    code,
  });
  return data;
}

export async function resetPassword(
  resetToken: string,
  password: string
): Promise<{ success: boolean }> {
  const { data } = await api.post<{ success: boolean }>('/auth/reset-password', {
    resetToken,
    password,
  });
  return data;
}
