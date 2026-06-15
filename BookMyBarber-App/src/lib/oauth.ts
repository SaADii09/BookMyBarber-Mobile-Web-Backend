import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { api } from "./api";

WebBrowser.maybeCompleteAuthSession();

export const AUTH_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: "bookmybarberapp",
  path: "auth",
});

export function useGoogleAuth() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  return Google.useAuthRequest({
    webClientId,
    iosClientId: iosClientId || webClientId,
    androidClientId: androidClientId || webClientId,
    scopes: ["openid", "profile", "email"],
  });
}

export async function signInWithMicrosoftOAuth(): Promise<{
  code: string;
  redirectUri: string;
}> {
  const { data } = await api.get<{ authUrl: string }>(
    "/auth/microsoft/connect",
    { params: { redirectUri: AUTH_REDIRECT_URI } }
  );

  const result = await WebBrowser.openAuthSessionAsync(
    data.authUrl,
    AUTH_REDIRECT_URI
  );

  if (result.type !== "success" || !result.url) {
    throw new Error("Microsoft sign-in was cancelled");
  }

  const parsed = new URL(result.url);
  const code = parsed.searchParams.get("code");
  if (!code) {
    throw new Error("Microsoft sign-in did not return an authorization code");
  }

  return { code, redirectUri: AUTH_REDIRECT_URI };
}
