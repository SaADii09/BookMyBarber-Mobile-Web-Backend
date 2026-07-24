import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import { setOnTokensCleared, setSessionTokens, tryRestoreSession } from "@/lib/api";
import { getMe, logout, type AuthUser } from "@/lib/auth";

export type AuthStatus = "loading" | "guest" | "authenticated";

interface AuthSessionContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  sessionKey: number;
  signingOut: boolean;
  onLoginSuccess: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

async function fetchMeWithRetry(): Promise<AuthUser> {
  try {
    const { user } = await getMe();
    return user;
  } catch (first) {
    // Network / 5xx: retry once — do not wipe tokens on transient failure
    if (!isUnauthorized(first)) {
      await new Promise((r) => setTimeout(r, 800));
      const { user } = await getMe();
      return user;
    }
    throw first;
  }
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const restored = await tryRestoreSession();
      if (!restored) {
        setUser(null);
        setStatus("guest");
        return;
      }

      try {
        const me = await fetchMeWithRetry();
        setUser(me);
        setStatus("authenticated");
      } catch (error) {
        // Only clear session when auth is actually invalid (401 after restore/refresh).
        // Transient network errors keep tokens so reopen can succeed later.
        if (isUnauthorized(error)) {
          await setSessionTokens(null, null);
          setUser(null);
          setStatus("guest");
          return;
        }
        // Tokens still valid — stay authenticated with unknown user until next fetch
        setUser(null);
        setStatus("authenticated");
      }
    } catch {
      setUser(null);
      setStatus("guest");
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // When the 401 interceptor or tryRestoreSession clears tokens (refresh
  // failed), transition to guest so the auth screens render immediately
  // instead of showing a broken authenticated shell.
  useEffect(() => {
    setOnTokensCleared(() => {
      setUser(null);
      setStatus("guest");
      setSessionKey((k) => k + 1);
    });
    return () => setOnTokensCleared(null);
  }, []);

  const onLoginSuccess = useCallback(async () => {
    const { user: me } = await getMe();
    setUser(me);
    setStatus("authenticated");
    setSessionKey((k) => k + 1);
  }, []);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    await logout();
    setTimeout(() => {
      setUser(null);
      setStatus("guest");
      setSessionKey((k) => k + 1);
    }, 150);
  }, []);

  return (
    <AuthSessionContext.Provider
      value={{ status, user, sessionKey, signingOut, onLoginSuccess, signOut }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionContextValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return ctx;
}
