/**
 * MapTiler style URL for MapLibre (mobile only — not backend Geoapify/ORS).
 * Sign up: https://cloud.maptiler.com/
 */
export function getMapStyleUrl(): string {
  const key = process.env.EXPO_PUBLIC_MAPTILER_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "EXPO_PUBLIC_MAPTILER_API_KEY is not set. Copy BookMyBarber-App/.env.example to .env and add your MapTiler API key."
    );
  }
  return `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`;
}
