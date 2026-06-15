import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { applyNgrokHeaders, getApiBaseUrl } from "./api-config";

export const TOKEN_STORAGE_KEY = "bmb_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "bmb_refresh_token";

let refreshInFlight: Promise<string | null> | null = null;

/** True when a non-empty JWT is stored (call before protected routes). */
export async function hasStoredAccessToken(): Promise<boolean> {
  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  return Boolean(token?.trim());
}

export async function hasStoredRefreshToken(): Promise<boolean> {
  const token = await AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  return Boolean(token?.trim());
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export async function setAccessToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function setRefreshToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  } else {
    await AsyncStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export async function setSessionTokens(
  accessToken: string | null,
  refreshToken: string | null
): Promise<void> {
  await setAccessToken(accessToken);
  await setRefreshToken(refreshToken);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refresh?.trim()) return null;

  const baseUrl = getApiBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  applyNgrokHeaders(headers, baseUrl);

  try {
    const { data } = await axios.post<{
      session: { access_token: string; refresh_token: string };
    }>(`${baseUrl}/auth/refresh`, { refresh_token: refresh }, { headers });

    await setSessionTokens(
      data.session.access_token,
      data.session.refresh_token
    );
    return data.session.access_token;
  } catch {
    return null;
  }
}

function getJwtExpirySeconds(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** True when access JWT is missing, unparsable, expired, or expiring within skew. */
function accessTokenNeedsRefresh(token: string, skewSeconds = 60): boolean {
  const exp = getJwtExpirySeconds(token);
  if (exp === null) return true;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now + skewSeconds;
}

export async function tryRestoreSession(): Promise<boolean> {
  const access = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  const hasRefresh = await hasStoredRefreshToken();

  if (access?.trim()) {
    if (!accessTokenNeedsRefresh(access)) {
      return true;
    }
    if (hasRefresh) {
      const token = await refreshAccessToken();
      if (token) return true;
      await setSessionTokens(null, null);
      return false;
    }
    await setSessionTokens(null, null);
    return false;
  }

  if (!hasRefresh) return false;

  const token = await refreshAccessToken();
  if (token) return true;
  await setSessionTokens(null, null);
  return false;
}

api.interceptors.request.use(async (config) => {
  const baseUrl = getApiBaseUrl();
  applyNgrokHeaders(
    config.headers as Record<string, string>,
    baseUrl
  );

  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (__DEV__) {
    const method = (config.method ?? "get").toUpperCase();
    const path = config.url ?? "";
    console.log(`[BookMyBarber API] ${method} ${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      original.url?.includes("/auth/refresh") ||
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/register")
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
    }

    const newToken = await refreshInFlight;
    if (!newToken) {
      await setSessionTokens(null, null);
      return Promise.reject(error);
    }

    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  }
);
