import axios from "axios";

import { applyNgrokHeaders, getApiBaseUrl } from "./api-config";

export interface ApiHealthResult {
  ok: boolean;
  url: string;
  error?: string;
}

function formatHealthError(error: unknown, url: string): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ERR_NETWORK") {
      return `Cannot reach ${url}. Update EXPO_PUBLIC_API_URL in .env and run: npx expo start -c`;
    }
    if (error.code === "ECONNABORTED") {
      return `Timed out waiting for ${url}/health`;
    }
    if (error.response) {
      return `Backend responded with HTTP ${error.response.status}`;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Unknown connectivity error";
}

/** Public GET /health — no auth required. Any HTTP response means the server was reached. */
export async function checkApiHealth(): Promise<ApiHealthResult> {
  const url = getApiBaseUrl();
  const headers: Record<string, string> = {};
  applyNgrokHeaders(headers, url);

  try {
    await axios.get(`${url}/health`, { timeout: 5000, headers });
    return { ok: true, url };
  } catch (error: unknown) {
    return { ok: false, url, error: formatHealthError(error, url) };
  }
}
