import React from "react";
import { View } from "react-native";

import { HapticPressable } from "@/components/ui";
import { ThemedText } from "@/components/themed-text";
import {
  useApiConnectivity,
  type ConnectivityStatus,
} from "@/contexts/api-connectivity";

function truncateUrl(url: string, max = 42): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max - 3)}...`;
}

function statusLabel(status: ConnectivityStatus): string {
  switch (status) {
    case "checking":
      return "Checking…";
    case "ok":
      return "Connected";
    case "error":
      return "Unreachable";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusTextClass(status: ConnectivityStatus): string {
  switch (status) {
    case "ok":
      return "text-green-400";
    case "error":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

type ApiConnectivityBannerProps = {
  variant?: "full" | "compact";
};

export function ApiConnectivityBanner({
  variant = "full",
}: ApiConnectivityBannerProps) {
  const { status, url, error, retry } = useApiConnectivity();

  if (!__DEV__) return null;

  if (variant === "compact") {
    if (status !== "error") return null;
    return (
      <View className="absolute left-0 right-0 top-0 z-[1100] bg-destructive/90 px-3 py-2">
        <ThemedText className="font-body text-center text-xs text-destructive-foreground">
          Backend unreachable — tap to retry
        </ThemedText>
        <HapticPressable
          className="absolute inset-0"
          onPress={retry}
          accessibilityLabel="Retry backend connection"
        />
      </View>
    );
  }

  return (
    <View className="mb-4 rounded-lg border border-border bg-secondary/80 px-3 py-2">
      <View className="flex-row items-center justify-between gap-2">
        <ThemedText className={`font-body text-xs font-semibold ${statusTextClass(status)}`}>
          API: {statusLabel(status)}
        </ThemedText>
        {status === "error" && (
          <HapticPressable onPress={retry}>
            <ThemedText className="font-body text-xs font-semibold text-primary">
              Retry
            </ThemedText>
          </HapticPressable>
        )}
      </View>
      {url ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          className="mt-1 font-mono text-[10px]">
          {truncateUrl(url)}
        </ThemedText>
      ) : null}
      {status === "error" && error ? (
        <ThemedText type="small" className="mt-1 text-xs text-destructive">
          {error}
        </ThemedText>
      ) : null}
      {status === "error" ? (
        <ThemedText type="small" themeColor="textSecondary" className="mt-1 text-[10px]">
          Update .env then run: npx expo start -c
        </ThemedText>
      ) : null}
    </View>
  );
}
