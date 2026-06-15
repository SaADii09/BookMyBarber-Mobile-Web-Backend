import * as Device from "expo-device";

const LOCALHOST_PATTERN = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i;

function resolveRawApiUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env, set your backend URL, then run: npx expo start -c"
    );
  }
  return raw;
}

function validateApiUrl(url: string): string {
  if (!/^https?:\/\//.test(url)) {
    throw new Error(
      `EXPO_PUBLIC_API_URL must start with http:// or https:// (got: ${url})`
    );
  }
  if (!url.endsWith("/v1")) {
    throw new Error(`EXPO_PUBLIC_API_URL must end with /v1 (got: ${url})`);
  }
  if (!__DEV__ && LOCALHOST_PATTERN.test(url)) {
    throw new Error(
      "EXPO_PUBLIC_API_URL cannot use localhost in production builds"
    );
  }
  return url;
}

export function isNgrokHost(url: string): boolean {
  try {
    return new URL(url).hostname.includes("ngrok");
  } catch {
    return url.includes("ngrok");
  }
}

let cachedUrl: string | null = null;

/** Validated API base URL (includes `/v1`). */
export function getApiBaseUrl(): string {
  if (!cachedUrl) {
    cachedUrl = validateApiUrl(resolveRawApiUrl());
    if (__DEV__ && LOCALHOST_PATTERN.test(cachedUrl) && Device.isDevice) {
      console.warn(
        "[BookMyBarber] EXPO_PUBLIC_API_URL points to localhost on a physical device — requests will not reach your PC. Use your LAN IP or ngrok instead."
      );
    }
  }
  return cachedUrl;
}

export function applyNgrokHeaders(
  headers: Record<string, string>,
  baseUrl: string
): void {
  if (isNgrokHost(baseUrl)) {
    headers["ngrok-skip-browser-warning"] = "true";
  }
}
