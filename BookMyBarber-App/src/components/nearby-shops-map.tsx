import { useEffect, useState, type ComponentType } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";

import { isMapNativeModuleExpected } from "@/lib/map-native";
import { MapUnavailable } from "@/components/map-unavailable";
import { COLORS } from "@/constants/design-tokens";
import type { NearbyShopsMapImplProps } from "@/components/nearby-shops-map-impl";

export type { MapShopMarker } from "@/components/nearby-shops-map-impl";

export function NearbyShopsMap(props: NearbyShopsMapImplProps) {
  const [Impl, setImpl] = useState<ComponentType<NearbyShopsMapImplProps> | null>(null);
  const [unavailable, setUnavailable] = useState(!isMapNativeModuleExpected());

  useEffect(() => {
    if (!isMapNativeModuleExpected()) return;

    let cancelled = false;
    import("@/components/nearby-shops-map-impl")
      .then((mod) => {
        if (!cancelled) setImpl(() => mod.NearbyShopsMapImpl);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (unavailable) {
    return <MapUnavailable variant="nearby" />;
  }

  if (!Impl) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return <Impl {...props} />;
}

const styles = StyleSheet.create({
  loading: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
});
