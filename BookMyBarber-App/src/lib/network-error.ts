import axios from "axios";

import { getApiBaseUrl } from "./api-config";

/** User-facing message for failed API calls (auth, bookings, etc.). */
export function formatApiError(
  error: unknown,
  fallback = "Request failed"
): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ERR_NETWORK") {
      return `Network error — cannot reach ${getApiBaseUrl()}. Check EXPO_PUBLIC_API_URL and run: npx expo start -c`;
    }
    if (error.code === "ECONNABORTED") {
      return `Request timed out — backend at ${getApiBaseUrl()} did not respond in time.`;
    }
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
