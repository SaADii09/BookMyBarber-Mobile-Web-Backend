/** Map viewport (MapLibre Camera), replaces react-native-maps Region. */
export type MapCameraState = {
  latitude: number;
  longitude: number;
  zoom: number;
};

export function latitudeDeltaToZoom(latitudeDelta: number): number {
  const delta = Math.max(latitudeDelta, 0.001);
  return Math.min(18, Math.max(4, Math.round(Math.log2(360 / delta))));
}

export function zoomToLatitudeDelta(zoom: number): number {
  return 360 / Math.pow(2, zoom);
}

export function cameraFromCoords(
  latitude: number,
  longitude: number,
  latitudeDelta = 0.06
): MapCameraState {
  return {
    latitude,
    longitude,
    zoom: latitudeDeltaToZoom(latitudeDelta),
  };
}

export function coordsToLngLat(latitude: number, longitude: number): [number, number] {
  return [longitude, latitude];
}

export function defaultShopMapCamera(
  city: "Gujranwala" | "Lahore" | "Vehari",
  cityCoords: Record<string, { latitude: number; longitude: number }>
): MapCameraState {
  const c = cityCoords[city];
  return cameraFromCoords(c.latitude, c.longitude, 0.06);
}
