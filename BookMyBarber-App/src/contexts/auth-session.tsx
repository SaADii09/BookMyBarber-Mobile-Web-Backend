import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { setSessionTokens, tryRestoreSession } from "@/lib/api";
import { getMe, logout, type AuthUser } from "@/lib/auth";

export type AuthStatus = "loading" | "guest" | "authenticated";

interface AuthSessionContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  sessionKey: number;
  onLoginSuccess: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const loadSession = useCallback(async () => {
    try {
      const restored = await tryRestoreSession();
      if (!restored) {
        setUser(null);
        setStatus("guest");
        return;
      }
      const { user: me } = await getMe();
      setUser(me);
      setStatus("authenticated");
    } catch {
      await setSessionTokens(null, null);
      setUser(null);
      setStatus("guest");
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const onLoginSuccess = useCallback(async () => {
    const { user: me } = await getMe();
    setUser(me);
    setStatus("authenticated");
    setSessionKey((k) => k + 1);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      setStatus("guest");
      setSessionKey((k) => k + 1);
    }
  }, []);

  return (
    <AuthSessionContext.Provider
      value={{ status, user, sessionKey, onLoginSuccess, signOut }}
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
