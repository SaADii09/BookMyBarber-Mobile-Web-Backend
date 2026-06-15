import { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import {
  Map,
  Camera,
  Marker,
  GeoJSONSource,
  Layer,
  UserLocation,
} from "@maplibre/maplibre-react-native";
import { MapPin } from "lucide-react-native";

import { COLORS } from "@/constants/design-tokens";
import { getMapStyleUrl } from "@/lib/map-style";
import { coordsToLngLat, type MapCameraState } from "@/lib/map-camera";

export type MapShopMarker = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
};

export type NearbyShopsMapImplProps = {
  camera: MapCameraState;
  shops: MapShopMarker[];
  trackingCoords: { latitude: number; longitude: number } | null;
  selectedShop: MapShopMarker | null;
  routePolyline: Array<{ latitude: number; longitude: number }>;
  onShopPress: (shop: MapShopMarker) => void;
  onCameraChange?: (camera: MapCameraState) => void;
};

export function NearbyShopsMapImpl({
  camera,
  shops,
  trackingCoords,
  selectedShop,
  routePolyline,
  onShopPress,
  onCameraChange,
}: NearbyShopsMapImplProps) {
  const routeGeoJson = useMemo(() => {
    if (routePolyline.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: routePolyline.map((p) => [p.longitude, p.latitude]),
      },
    };
  }, [routePolyline]);

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={getMapStyleUrl()}
        logo={false}
        attribution
        attributionPosition={{ bottom: 4, right: 4 }}
        onRegionDidChange={
          onCameraChange
            ? (e) => {
              const { center, zoom, userInteraction } = e.nativeEvent;
              if (!userInteraction) return;
              onCameraChange({
                latitude: center[1],
                longitude: center[0],
                zoom,
              });
            }
            : undefined
        }
      >
        <Camera
          center={coordsToLngLat(camera.latitude, camera.longitude)}
          zoom={camera.zoom}
        />
        <UserLocation />

        {routeGeoJson ? (
          <GeoJSONSource id="route-source" data={routeGeoJson}>
            <Layer
              id="route-line"
              type="line"
              paint={{ "line-color": "#E77423", "line-width": 5 }}
            />
          </GeoJSONSource>
        ) : null}

        <Marker id="user-center" lngLat={coordsToLngLat(camera.latitude, camera.longitude)}>
          <MapPin size={22} color={COLORS.primary} />
        </Marker>

        {shops.map((shop) => (
          <Marker
            key={`shop-${shop.id}`}
            id={`shop-${shop.id}`}
            lngLat={coordsToLngLat(Number(shop.latitude), Number(shop.longitude))}
            anchor="bottom"
            onPress={() => onShopPress(shop)}
          >
            <TouchableOpacity onPress={() => onShopPress(shop)} activeOpacity={0.8}>
              <MapPin size={26} color="#676F7E" />
            </TouchableOpacity>
          </Marker>
        ))}

        {trackingCoords ? (
          <Marker
            id="tracking"
            lngLat={coordsToLngLat(trackingCoords.latitude, trackingCoords.longitude)}
          >
            <View style={styles.trackingDot} />
          </Marker>
        ) : null}

        {selectedShop?.latitude != null && selectedShop?.longitude != null ? (
          <Marker
            id="selected-shop"
            lngLat={coordsToLngLat(
              Number(selectedShop.latitude),
              Number(selectedShop.longitude)
            )}
            anchor="bottom"
          >
            <MapPin size={30} color="#E77423" />
          </Marker>
        ) : null}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  trackingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2FA84F",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
