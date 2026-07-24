import { useEffect, useState, type ComponentType } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";

import { isMapNativeModuleExpected } from "@/lib/map-native";
import { MapUnavailable } from "@/components/map-unavailable";
import { COLORS } from "@/constants/design-tokens";
import type { ShopLocationMapImplProps } from "@/components/shop-location-map-impl";

export function ShopLocationMap(props: ShopLocationMapImplProps) {
  const [Impl, setImpl] = useState<ComponentType<ShopLocationMapImplProps> | null>(null);
  const [unavailable, setUnavailable] = useState(!isMapNativeModuleExpected());

  useEffect(() => {
    if (!isMapNativeModuleExpected()) return;

    let cancelled = false;
    import("@/components/shop-location-map-impl")
      .then((mod) => {
        if (!cancelled) setImpl(() => mod.ShopLocationMapImpl);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (unavailable) {
    return <MapUnavailable variant="picker" />;
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
    height: 240,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
});
