import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import Geolocation from 'react-native-geolocation-service';
import { appAlert } from '@/lib/app-alert';
import type { ShopNavTarget } from '@/lib/booking-types';
import { getRoutePath } from '@/lib/shops';

export function useShopNavigation() {
  const watchIdRef = useRef<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingCoords, setTrackingCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routePolyline, setRoutePolyline] = useState<
    Array<{ latitude: number; longitude: number }>
  >([]);
  const [routeMeta, setRouteMeta] = useState<{
    distanceMeters: number;
    durationSeconds: number;
  } | null>(null);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setRoutePolyline([]);
    setRouteMeta(null);
    setTrackingCoords(null);
  }, []);

  useEffect(() => () => stopTracking(), [stopTracking]);

  const fetchRouteToShop = useCallback(
    async (
      origin: { latitude: number; longitude: number },
      destination: { latitude: number; longitude: number }
    ) => {
      try {
        const { route } = await getRoutePath({
          originLat: origin.latitude,
          originLng: origin.longitude,
          destinationLat: destination.latitude,
          destinationLng: destination.longitude,
        });
        setRoutePolyline(route.points || []);
        setRouteMeta({
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
        });
      } catch {
        setRoutePolyline([]);
        setRouteMeta(null);
      }
    },
    []
  );

  const openExternalNavigation = useCallback((shop: ShopNavTarget) => {
    if (shop.latitude == null || shop.longitude == null) {
      appAlert('Missing location', 'This barber shop does not have map coordinates yet.');
      return;
    }
    const lat = Number(shop.latitude);
    const lng = Number(shop.longitude);
    const label = encodeURIComponent(
      `${shop.name || 'Barber Shop'} - ${shop.address || ''}`.trim()
    );
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    const appleUrl = `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`;
    const navUrl = Platform.OS === 'ios' ? appleUrl : googleUrl;
    Linking.openURL(navUrl).catch(() => appAlert('Error', 'Unable to open navigation app'));
  }, []);

  const startTrackingToShop = useCallback(
    async (shop: ShopNavTarget) => {
      if (shop.latitude == null || shop.longitude == null) {
        appAlert('Missing location', 'This barber shop does not have map coordinates yet.');
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        appAlert('Permission needed', 'Location permission is required for live tracking.');
        return;
      }

      stopTracking();
      setIsTracking(true);
      const destination = {
        latitude: Number(shop.latitude),
        longitude: Number(shop.longitude),
      };

      watchIdRef.current = Geolocation.watchPosition(
        async (position) => {
          const current = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setTrackingCoords(current);
          await fetchRouteToShop(current, destination);
        },
        () => {
          appAlert('Tracking error', 'Could not read your location.');
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 15,
          interval: 6000,
          fastestInterval: 3000,
          showLocationDialog: true,
          forceRequestLocation: true,
        }
      );
    },
    [fetchRouteToShop, stopTracking]
  );

  return {
    isTracking,
    trackingCoords,
    routePolyline,
    routeMeta,
    startTrackingToShop,
    stopTracking,
    openExternalNavigation,
  };
}
