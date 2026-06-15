import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  api,
  REFRESH_TOKEN_STORAGE_KEY,
  setSessionTokens,
  tryRestoreSession,
} from "./api";

export type UserRole = "customer" | "barber" | "admin";

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
  role: UserRole = "customer"
): Promise<AuthSession> {
  const { data } = await api.post<AuthSession>("/auth/register", {
    email,
    password,
    role,
  });
  return persistSession(data);
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
  try {
    await api.post("/auth/logout", { refresh_token: refreshToken });
  } finally {
    await setSessionTokens(null, null);
  }
}

export async function getMe(): Promise<{ user: AuthUser }> {
  const { data } = await api.get<{ user: AuthUser }>("/auth/me");
  return data;
}
