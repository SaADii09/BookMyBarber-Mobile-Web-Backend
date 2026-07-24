import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  api,
  REFRESH_TOKEN_STORAGE_KEY,
  setSessionTokens,
  tryRestoreSession,
} from "./api";

export type UserRole = "customer" | "barber" | "admin";

export type ProfileCity = "Gujranwala" | "Lahore" | "Vehari";

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

/** Mirrors backend AuthSignupPendingResponse */
export interface AuthSignupPending {
  requiresEmailVerification: true;
  email: string;
  isExisting?: boolean;
}

async function persistSession(data: AuthSession): Promise<AuthSession> {
  await setSessionTokens(
    data.session.access_token,
    data.session.refresh_token
  );
  return data;
}

/** All auth flows go through the backend — never Supabase directly. */
export async function login(
  email: string,
  password: string
): Promise<AuthSession> {
  const { data } = await api.post<AuthSession>("/auth/login", { email, password });
  return persistSession(data);
}

export async function register(
  email: string,
  password: string,
  role: UserRole = "customer",
  profile?: { name?: string; city?: ProfileCity }
): Promise<AuthSignupPending> {
  const { data } = await api.post<AuthSignupPending>("/auth/register", {
    email,
    password,
    role,
    ...(profile?.name ? { name: profile.name } : {}),
    ...(profile?.city ? { city: profile.city } : {}),
  });
  return data;
}

export async function verifyEmail(
  email: string,
  code: string
): Promise<AuthSession> {
  const { data } = await api.post<AuthSession>("/auth/verify-email", { email, code });
  return persistSession(data);
}

export async function resendVerification(
  email: string
): Promise<{ sent: true }> {
  const { data } = await api.post<{ sent: true }>("/auth/resend-verification", {
    email,
  });
  return data;
}

export async function loginWithGoogle(idToken: string): Promise<AuthSession> {
  const { data } = await api.post<AuthSession>("/auth/google", { idToken });
  return persistSession(data);
}

export async function loginWithMicrosoft(
  code: string,
  redirectUri: string
): Promise<AuthSession> {
  const { data } = await api.post<AuthSession>("/auth/microsoft/exchange", {
    code,
    redirectUri,
  });
  return persistSession(data);
}

export { tryRestoreSession };

export async function logout(): Promise<void> {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  await setSessionTokens(null, null);
  if (refreshToken) {
    api.post("/auth/logout", { refresh_token: refreshToken }).catch(() => {});
  }
}

export async function getMe(): Promise<{ user: AuthUser }> {
  const response = await api.get<{ user: AuthUser }>("/auth/me", {
    params: { t: Date.now() },
  });
  if (!response.data?.user) {
    throw new Error("Session stale");
  }
  return response.data;
}
