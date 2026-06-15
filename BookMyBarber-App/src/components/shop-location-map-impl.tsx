import { useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, type NativeSyntheticEvent } from "react-native";
import {
  Map,
  Camera,
  UserLocation,
  type ViewStateChangeEvent,
} from "@maplibre/maplibre-react-native";
import { MapPin } from "lucide-react-native";

import { COLORS } from "@/constants/design-tokens";
import { getMapStyleUrl } from "@/lib/map-style";
import { coordsToLngLat, type MapCameraState } from "@/lib/map-camera";

export type ShopLocationMapImplProps = {
  camera: MapCameraState;
  onCameraChange: (camera: MapCameraState) => void;
  onCoordinateChange: (latitude: number, longitude: number) => void;
  showUserLocation?: boolean;
};

export function ShopLocationMapImpl({
  camera,
  onCameraChange,
  onCoordinateChange,
  showUserLocation = true,
}: ShopLocationMapImplProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleRegionDidChange = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const { center, zoom, userInteraction } = event.nativeEvent;
      if (!userInteraction) return;

      const next: MapCameraState = {
        latitude: center[1],
        longitude: center[0],
        zoom,
      };
      onCameraChange(next);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onCoordinateChange(center[1], center[0]);
      }, 300);
    },
    [onCameraChange, onCoordinateChange]
  );

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={getMapStyleUrl()}
        logo={false}
        attribution
        attributionPosition={{ bottom: 4, right: 4 }}
        onRegionDidChange={handleRegionDidChange}
      >
        <Camera
          center={coordsToLngLat(camera.latitude, camera.longitude)}
          zoom={camera.zoom}
        />
        {showUserLocation ? <UserLocation /> : null}
      </Map>
      <View style={styles.crosshair} pointerEvents="none">
        <MapPin size={36} color={COLORS.primary} fill={COLORS.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 240,
    borderRadius: 16,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  crosshair: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
});
