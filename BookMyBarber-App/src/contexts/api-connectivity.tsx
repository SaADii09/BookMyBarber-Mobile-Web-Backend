import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { getApiBaseUrl } from "@/lib/api-config";
import { checkApiHealth } from "@/lib/connectivity";

export type ConnectivityStatus = "checking" | "ok" | "error";

interface ApiConnectivityContextValue {
    status: ConnectivityStatus;
    url: string;
    error?: string;
    retry: () => void;
}

const ApiConnectivityContext =
    createContext<ApiConnectivityContextValue | null>(null);

export function ApiConnectivityProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [status, setStatus] = useState<ConnectivityStatus>("checking");
    const [url, setUrl] = useState(() => {
        try {
            return getApiBaseUrl();
        } catch {
            return "";
        }
    });
    const [error, setError] = useState<string | undefined>();
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);

    const runCheck = useCallback(async () => {
        setStatus("checking");
        try {
            const baseUrl = getApiBaseUrl();
            setUrl(baseUrl);
            const result = await checkApiHealth();
            setUrl(result.url);
            if (result.ok) {
                setStatus("ok");
                setError(undefined);
            } else {
                setStatus("error");
                setError(result.error);
            }
        } catch (err) {
            setStatus("error");
            setError(
                err instanceof Error
                    ? err.message
                    : "Invalid API configuration",
            );
        }
    }, []);

    useEffect(() => {
        void runCheck();
    }, [runCheck]);

    useEffect(() => {
        const subscription = AppState.addEventListener(
            "change",
            (nextState) => {
                if (
                    appStateRef.current.match(/inactive|background/) &&
                    nextState === "active"
                ) {
                    void runCheck();
                }
                appStateRef.current = nextState;
            },
        );
        return () => subscription.remove();
    }, [runCheck]);

    return (
        <ApiConnectivityContext.Provider
            value={{ status, url, error, retry: runCheck }}
        >
            {children}
        </ApiConnectivityContext.Provider>
    );
}

export function useApiConnectivity(): ApiConnectivityContextValue {
    const ctx = useContext(ApiConnectivityContext);
    if (!ctx) {
        throw new Error(
            "useApiConnectivity must be used within ApiConnectivityProvider",
        );
    }
    return ctx;
}
