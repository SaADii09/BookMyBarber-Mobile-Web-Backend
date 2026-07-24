import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Image,
  Platform,
  Linking,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapPin, Search, Scissors, Star, X } from "lucide-react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import * as Location from "expo-location";
import Geolocation from "react-native-geolocation-service";
import { NearbyShopsMap } from "@/components/nearby-shops-map";
import { ShopLocationMap } from "@/components/shop-location-map";
import { ShopPhoneInput } from "@/components/shop-phone-input";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DashboardActionCards } from "@/components/barber/dashboard-action-cards";
import { BarberShopCard } from "@/components/barber/barber-shop-card";
import type { BarberShopSummary } from "@/lib/booking-types";
import { HapticPressable } from "@/components/ui";
import { EmptyState } from "@/components/ui/empty-state";
import { COLORS } from "@/constants/design-tokens";
import { home } from "@/constants/home-ui";
import axios from "axios";
import { api, hasStoredAccessToken } from "@/lib/api";
import { useAuthSession } from "@/contexts/auth-session";
import { useSystemBars } from "@/hooks/use-system-bars";
import { autocompletePlaces, getPlaceDetails } from "@/lib/places";
import {
  cameraFromCoords,
  defaultShopMapCamera,
  type MapCameraState,
} from "@/lib/map-camera";
import { toPakistanE164 } from "@/lib/pakistan-phone";
import { formatApiError } from "@/lib/network-error";
import { appAlert } from "@/lib/app-alert";
import { getNearbyShops, getRoutePath, reverseGeocode, updateShopLocation, fetchMyShopSummary } from "@/lib/shops";

export type MapLocationMode = "gps" | "city_fallback" | "permission_denied";

const CITY_COORDS: Record<"Gujranwala" | "Lahore" | "Vehari", { latitude: number; longitude: number }> = {
  Gujranwala: { latitude: 32.1877, longitude: 74.1945 },
  Lahore: { latitude: 31.5204, longitude: 74.3587 },
  Vehari: { latitude: 30.0445, longitude: 72.3556 },
};

export default function HomeScreen() {
  const scheme = useColorScheme();
  const { status, user, signOut } = useAuthSession();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Customer state
  const [shops, setShops] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapExpanded, setMapExpanded] = useState(true);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [shopDetail, setShopDetail] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [mapLocationMode, setMapLocationMode] = useState<MapLocationMode | null>(null);
  const [mapCamera, setMapCamera] = useState<MapCameraState | null>(null);
  const [mapShops, setMapShops] = useState<any[]>([]);
  const radiusKm = 10;
  const [isTracking, setIsTracking] = useState(false);
  const [trackingCoords, setTrackingCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routePolyline, setRoutePolyline] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeMeta, setRouteMeta] = useState<{ distanceMeters: number; durationSeconds: number } | null>(null);

  // Barber state
  const [myShops, setMyShops] = useState<BarberShopSummary[]>([]);
  const [addShopVisible, setAddShopVisible] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const [newShopDesc, setNewShopDesc] = useState("");
  const [newShopAddr, setNewShopAddr] = useState("");
  const [newShopPhone, setNewShopPhone] = useState("");
  const [newShopCity, setNewShopCity] = useState<"Gujranwala" | "Lahore" | "Vehari">("Lahore");
  const [locationEditShop, setLocationEditShop] = useState<any>(null);
  const [newShopLat, setNewShopLat] = useState<number | null>(null);
  const [newShopLng, setNewShopLng] = useState<number | null>(null);
  const [addShopMapCamera, setAddShopMapCamera] = useState<MapCameraState | null>(null);
  const [cityPinHint, setCityPinHint] = useState<string | null>(null);
  const [placeSearch, setPlaceSearch] = useState("");
  const [placePredictions, setPlacePredictions] = useState<any[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const placesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesConfigAlertShownRef = useRef(false);

  const [manageWorkersShop, setManageWorkersShop] = useState<any>(null);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerSpecialties, setNewWorkerSpecialties] = useState("");

  const anyModalOpen = !!(selectedShop || addShopVisible || manageWorkersShop);
  useSystemBars({
    statusBarStyle: anyModalOpen ? 'light' : scheme === 'dark' ? 'light' : 'dark',
    navigationBarStyle: scheme === 'dark' ? 'light' : 'dark',
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchProfileAndData();
    }
  }, [status]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
      if (placesDebounceRef.current) {
        clearTimeout(placesDebounceRef.current);
      }
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!addShopVisible) return;
    if (newShopLat !== null && newShopLng !== null) return;
    setAddShopMapCamera(getCityFallbackCamera(newShopCity));
  }, [addShopVisible, newShopCity, newShopLat, newShopLng]);

  const fetchProfileAndData = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);

    // If no access token is stored, immediately transition to guest
    // instead of hitting the backend with a missing Authorization header.
    if (!(await hasStoredAccessToken())) {
      if (!opts?.silent) setLoading(false);
      signOut();
      return;
    }

    try {
      const { data } = await api.get("/app/profile");
      setProfile(data.profile);

      if (data.profile.role === "customer") {
        await fetchCustomerShops(data.profile.city);
        fetchNearbyShops();
      } else if (data.profile.role === "barber") {
        fetchBarberShops();
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          if (!opts?.silent) setLoading(false);
          signOut();
          return;
        }
        if (err.response?.status === 403) {
          setProfile({ role: user?.role ?? "admin" });
          return;
        }
      }
      console.error("Failed to load home data", err);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (status === "authenticated" && profile?.role && profile.role !== "admin") {
        void fetchProfileAndData({ silent: true });
      }
    }, [status, profile?.role])
  );

  const openAddShop = async () => {
    setLocationEditShop(null);
    setNewShopLat(null);
    setNewShopLng(null);
    setNewShopPhone("");
    setCityPinHint(null);
    placesConfigAlertShownRef.current = false;
    await initializeAddShopMap(newShopCity, null, null);
    setAddShopVisible(true);
  };

  const onBarberRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data } = await api.get("/app/profile");
      setProfile(data.profile);
      await fetchBarberShops();
    } catch (err) {
      console.error("Failed to refresh barber dashboard", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Customer methods
  const resolveCurrentLocation = async (): Promise<MapCameraState | null> => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setMapLocationMode("permission_denied");
      return null;
    }
    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextCamera = cameraFromCoords(
        current.coords.latitude,
        current.coords.longitude,
        0.12
      );
      setMapCamera(nextCamera);
      setMapLocationMode("gps");
      return nextCamera;
    } catch {
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          const nextCamera = cameraFromCoords(
            last.coords.latitude,
            last.coords.longitude,
            0.12
          );
          setMapCamera(nextCamera);
          setMapLocationMode("gps");
          return nextCamera;
        }
      } catch {
        /* fall through to city fallback */
      }
      return null;
    }
  };

  const resolveMapCameraForNearby = async (): Promise<MapCameraState> => {
    if (mapCamera) {
      return mapCamera;
    }
    const gps = await resolveCurrentLocation();
    if (gps) {
      return gps;
    }
    const city = (profile?.city ?? "Lahore") as "Gujranwala" | "Lahore" | "Vehari";
    const fallback = getCityFallbackCamera(city);
    setMapCamera(fallback);
    setMapLocationMode((prev) =>
      prev === "permission_denied" ? "permission_denied" : "city_fallback"
    );
    return fallback;
  };

  const fetchNearbyShops = async (query = "") => {
    try {
      const camera = await resolveMapCameraForNearby();
      const data = await getNearbyShops({
        lat: camera.latitude,
        lng: camera.longitude,
        query: query || undefined,
        radiusKm,
        limit: 50,
      });
      setMapShops(data.shops || []);
    } catch (err) {
      console.error("Failed to load nearby shops", err);
      appAlert("Could not load nearby shops", formatApiError(err, "Try again in a moment."), undefined, {
        variant: "error",
      });
    }
  };

  const fetchCustomerShops = async (city: string, query = "") => {
    try {
      const params: Record<string, string> = {};
      if (city) params.city = city;
      if (query) params.query = query;
      const { data } = await api.get("/app/shops/search", { params });
      setShops(data.shops || []);
    } catch (err) {
      console.error("Failed to search shops", err);
    }
  };

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (profile) {
        fetchCustomerShops(profile.city, text);
        fetchNearbyShops(text);
      }
    }, 300);
  };

  const handleViewShopDetails = async (shop: any) => {
    setSelectedShop(shop);
    setLoadingDetails(true);
    try {
      const { data } = await api.get(`/app/shops/${shop.id}`);
      setShopDetail(data);
    } catch {
      appAlert("Error", "Failed to load shop details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const getCityFallbackCamera = (city: "Gujranwala" | "Lahore" | "Vehari"): MapCameraState =>
    defaultShopMapCamera(city, CITY_COORDS);

  const setAddShopMapFromCoords = (latitude: number, longitude: number) => {
    setAddShopMapCamera(cameraFromCoords(latitude, longitude, 0.02));
  };

  const suggestAddressFromCoords = async (latitude: number, longitude: number) => {
    try {
      const result = await reverseGeocode(latitude, longitude);
      if (result.formattedAddress) {
        setNewShopAddr((prev) => prev || result.formattedAddress!);
      }
      if (result.city && ["Gujranwala", "Lahore", "Vehari"].includes(result.city)) {
        const detected = result.city as "Gujranwala" | "Lahore" | "Vehari";
        setNewShopCity((prev) => {
          if (prev !== detected) {
            setCityPinHint(`Pin looks like ${detected} — city chip was ${prev}. Tap ${detected} if correct.`);
          } else {
            setCityPinHint(null);
          }
          return detected;
        });
      }
    } catch (err) {
      console.error("Reverse geocode unavailable", err);
    }
  };

  const applyShopCoordinates = (latitude: number, longitude: number) => {
    setNewShopLat(latitude);
    setNewShopLng(longitude);
    setAddShopMapFromCoords(latitude, longitude);
    void suggestAddressFromCoords(latitude, longitude);
  };

  const initializeAddShopMap = async (
    city: "Gujranwala" | "Lahore" | "Vehari",
    lat?: number | null,
    lng?: number | null
  ) => {
    if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
      applyShopCoordinates(lat, lng);
      return;
    }
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === "granted") {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        applyShopCoordinates(current.coords.latitude, current.coords.longitude);
        return;
      }
    } catch (err) {
      console.error("Failed to initialize add-shop map from device location", err);
    }
    setAddShopMapCamera(getCityFallbackCamera(city));
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  const fetchRouteToShop = async (destination: { latitude: number; longitude: number }) => {
    if (!trackingCoords) return;
    try {
      const { route } = await getRoutePath({
        originLat: trackingCoords.latitude,
        originLng: trackingCoords.longitude,
        destinationLat: destination.latitude,
        destinationLng: destination.longitude,
      });
      setRoutePolyline(route.points || []);
      setRouteMeta({
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
      });
    } catch (err) {
      console.error("Failed to load route path", err);
    }
  };

  const startTrackingToShop = async (shop: any) => {
    if (!shop?.latitude || !shop?.longitude) {
      appAlert("Missing location", "This barber shop does not have map coordinates yet.");
      return;
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      appAlert("Permission needed", "Location permission is required for live tracking.");
      return;
    }

    setIsTracking(true);
    const destination = { latitude: Number(shop.latitude), longitude: Number(shop.longitude) };

    watchIdRef.current = Geolocation.watchPosition(
      async (position) => {
        const current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setTrackingCoords(current);
        setMapCamera((prev) => ({
          latitude: current.latitude,
          longitude: current.longitude,
          zoom: prev?.zoom ?? cameraFromCoords(current.latitude, current.longitude, 0.08).zoom,
        }));
        await fetchRouteToShop(destination);
      },
      (error) => {
        console.error("Tracking error", error);
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
  };

  const openExternalNavigation = (shop: any) => {
    if (!shop?.latitude || !shop?.longitude) {
      appAlert("Missing location", "This barber shop does not have map coordinates yet.");
      return;
    }
    const lat = Number(shop.latitude);
    const lng = Number(shop.longitude);
    const label = encodeURIComponent(`${shop.name || "Barber Shop"} - ${shop.address || ""}`.trim());
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    const appleUrl = `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`;
    const navUrl = Platform.OS === "ios" ? appleUrl : googleUrl;
    Linking.openURL(navUrl).catch(() => appAlert("Error", "Unable to open navigation app"));
  };

  // Barber methods
  const fetchBarberShops = async () => {
    try {
      const shops = await fetchMyShopSummary();
      setMyShops(shops);
    } catch (err) {
      console.error("Failed to load my shops", err);
    }
  };

  const handlePlacesAutocomplete = (text: string) => {
    setPlaceSearch(text);
    if (text.trim().length < 3) {
      setPlacePredictions([]);
      if (placesDebounceRef.current) {
        clearTimeout(placesDebounceRef.current);
      }
      return;
    }
    if (placesDebounceRef.current) {
      clearTimeout(placesDebounceRef.current);
    }
    placesDebounceRef.current = setTimeout(async () => {
      try {
        const predictions = await autocompletePlaces(text, mapCamera?.latitude, mapCamera?.longitude);
        setPlacePredictions(predictions);
      } catch (err) {
        console.error("Failed to autocomplete places", err);
        if (axios.isAxiosError(err) && err.response?.status === 503 && !placesConfigAlertShownRef.current) {
          placesConfigAlertShownRef.current = true;
          appAlert(
            "Address search unavailable",
            "Address search is not configured on the server yet. You can still set location manually on the map and type the address."
          );
        }
      }
    }, 350);
  };

  const handleSelectPlace = async (placeId: string) => {
    try {
      const place = await getPlaceDetails(placeId);
      if (place.name) setNewShopName((prev) => prev || place.name!);
      if (place.formattedAddress) setNewShopAddr(place.formattedAddress);
      if (place.city && ["Gujranwala", "Lahore", "Vehari"].includes(place.city)) {
        setNewShopCity(place.city as "Gujranwala" | "Lahore" | "Vehari");
      }
      if (place.lat !== null && place.lng !== null) {
        applyShopCoordinates(place.lat, place.lng);
      }
      setPlaceSearch(place.formattedAddress ?? place.name ?? "");
      setPlacePredictions([]);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 503) {
        appAlert(
          "Address search unavailable",
          "Address search is not configured on the server yet. You can still set location manually on the map and type the address."
        );
        return;
      }
      appAlert("Error", "Failed to fetch place details");
    }
  };

  const handleAddShop = async () => {
    const name = newShopName.trim();
    const address = newShopAddr.trim();
    const businessPhone = toPakistanE164(newShopPhone);
    if (!name || !address || newShopLat === null || newShopLng === null) {
      appAlert("Error", "Please fill in name/address and select a map location");
      return;
    }
    if (!businessPhone) {
      appAlert(
        "Invalid phone",
        "Enter a valid Pakistan mobile number: 10 digits starting with 3 (e.g. 300 1234567)."
      );
      return;
    }

    try {
      await api.post("/app/shops", {
        name,
        description: newShopDesc.trim() || undefined,
        address,
        city: newShopCity,
        latitude: newShopLat,
        longitude: newShopLng,
        businessPhone,
        logoUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/100`,
        bannerUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/400/200`,
      });
      appAlert("Success", "Shop registered! Awaiting Admin approval.");
      setAddShopVisible(false);
      setNewShopName("");
      setNewShopDesc("");
      setNewShopAddr("");
      setNewShopPhone("");
      setNewShopLat(null);
      setNewShopLng(null);
      setPlaceSearch("");
      setPlacePredictions([]);
      setLocationEditShop(null);
      setCityPinHint(null);
      fetchBarberShops();
    } catch (err: unknown) {
      appAlert("Error", formatApiError(err, "Failed to create shop"));
    }
  };

  const handleUpdateShopLocation = async (shop: any) => {
    if (newShopLat === null || newShopLng === null || !newShopAddr) {
      appAlert("Error", "Select a location first");
      return;
    }
    try {
      await updateShopLocation(shop.id, {
        address: newShopAddr,
        city: newShopCity,
        latitude: newShopLat,
        longitude: newShopLng,
      });
      appAlert("Success", "Shop location updated");
      fetchBarberShops();
    } catch (err: unknown) {
      appAlert("Error", formatApiError(err, "Failed to update location"));
    }
  };

  const handleAddWorker = async () => {
    if (!newWorkerName) {
      appAlert("Error", "Please enter worker name");
      return;
    }

    try {
      await api.post(`/app/shops/${manageWorkersShop.id}/workers`, {
        name: newWorkerName,
        specialties: newWorkerSpecialties.split(",").map((s) => s.trim()).filter(Boolean),
        avatarUrl: `https://i.pravatar.cc/100?u=${newWorkerName}`,
      });
      appAlert("Success", "Specialist added!");
      setNewWorkerName("");
      setNewWorkerSpecialties("");

      // Reload shop details if open
      const { data } = await api.get(`/app/shops/${manageWorkersShop.id}`);
      setManageWorkersShop(data.shop);
      setShopDetail(data);
    } catch (err: unknown) {
      appAlert("Error", formatApiError(err, "Failed to add worker"));
    }
  };

  const handleManageWorkers = async (shop: any) => {
    setManageWorkersShop(shop);
    setLoadingDetails(true);
    try {
      const { data } = await api.get(`/app/shops/${shop.id}`);
      setShopDetail(data);
    } catch {
      appAlert("Error", "Failed to load details");
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return (
      <ThemedView className={home.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </ThemedView>
    );
  }

  if (profile?.role === "admin") {
    return (
      <ThemedView className={home.container}>
        <SafeAreaView className={`${home.safeArea} ${home.emptyState}`}>
          <ThemedText type="subtitle" className="text-center">
            Admin account
          </ThemedText>
          <ThemedText themeColor="textSecondary" className="mt-3 text-center px-6">
            Use the BookMyBarber web dashboard for admin tasks. Sign out to use a customer or barber account in the app.
          </ThemedText>
          <TouchableOpacity
            className={`${home.logoutBtn} mt-6`}
            onPress={() => signOut()}
          >
            <ThemedText className="font-body text-sm text-destructive">Sign out</ThemedText>
          </TouchableOpacity>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // 1. CUSTOMER HOMEPAGE VIEW
  if (profile?.role === "customer") {
    return (
      <ThemedView className={home.container}>
        <SafeAreaView className={home.safeArea}>
          {/* Header */}
          <View className={home.header}>
            <View className="flex-1 pr-3">
              <ThemedText className={home.welcomeText}>
                Hello, {profile.name?.trim() || user?.email?.split("@")[0] || "there"}!
              </ThemedText>
              <View className={home.cityBadge}>
                <MapPin size={14} color={COLORS.primary} />
                <ThemedText type="smallBold" className={home.cityText}>
                  {profile.city}
                </ThemedText>
              </View>
            </View>
            <HapticPressable className={home.accountChip} onPress={() => router.push("/profile" as Href)}>
              <ThemedText className="font-body text-sm font-semibold text-primary">Account</ThemedText>
            </HapticPressable>
          </View>

          {/* Search bar with clear button */}
          <View className={home.searchSection}>
            <Search size={18} color={COLORS.mutedForeground} className={home.searchIcon} />
            <TextInput
              className={home.searchInput}
              placeholder="Search barber shops..."
              placeholderTextColor={COLORS.mutedForeground}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                className={home.clearSearchBtn}
                onPress={() => {
                  setSearchQuery("");
                  if (profile) fetchCustomerShops(profile.city, "");
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={COLORS.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {/* Results count badge */}
          {searchQuery.trim().length > 0 && (
            <View className={home.searchResultBadge}>
              <ThemedText className={home.resultCount}>
                {shops.length > 0
                  ? `${shops.length} shop${shops.length !== 1 ? "s" : ""} found for "${searchQuery}"`
                  : `No results for "${searchQuery}"`}
              </ThemedText>
            </View>
          )}

          {/* Collapsible Map Section */}
          <View className="mb-4">
            <TouchableOpacity
              className={home.mapToggle}
              onPress={() => setMapExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <ThemedText className={home.mapToggleLabel}>
                {mapExpanded ? "Collapse map" : `Map (${radiusKm} km)`}
              </ThemedText>
              <ThemedText className="font-body text-xs text-primary">
                {mapExpanded ? "▲ Hide" : "▼ Show"}
              </ThemedText>
            </TouchableOpacity>

            {mapExpanded && (
              <>
                {mapLocationMode && mapLocationMode !== "gps" ? (
                  <ThemedText themeColor="textSecondary" className="mb-2 font-body text-xs">
                    {mapLocationMode === "permission_denied"
                      ? `Location permission denied. Showing shops near ${profile?.city ?? "your city"} center.`
                      : `Using ${profile?.city ?? "your city"} center — enable location for results near you.`}
                  </ThemedText>
                ) : null}
                {mapCamera && Platform.OS !== "web" ? (
                  <NearbyShopsMap
                    camera={mapCamera}
                    shops={mapShops}
                    trackingCoords={trackingCoords}
                    selectedShop={selectedShop}
                    routePolyline={routePolyline}
                    onShopPress={handleViewShopDetails}
                    onCameraChange={setMapCamera}
                  />
                ) : (
                  <View className={home.emptyState}>
                    <ThemedText themeColor="textSecondary">
                      {mapLocationMode === "permission_denied" || mapLocationMode === "city_fallback"
                        ? `Map preview needs location. Nearby list uses ${profile?.city ?? "your city"} center.`
                        : "Map preview is unavailable on this platform."}
                    </ThemedText>
                  </View>
                )}
                <TouchableOpacity className={`${home.addBtnSecondary} mt-3`} onPress={() => fetchNearbyShops(searchQuery)}>
                  <MapPin size={16} color={COLORS.primary} />
                  <ThemedText className={home.addBtnTextSecondary}>Refresh nearby barbers</ThemedText>
                </TouchableOpacity>
                {routeMeta && (
                  <ThemedText type="small" themeColor="textSecondary" className="mt-2">
                    Route: {(routeMeta.distanceMeters / 1000).toFixed(1)} km • {Math.ceil(routeMeta.durationSeconds / 60)} min
                  </ThemedText>
                )}
                {isTracking && selectedShop?.address ? (
                  <ThemedText type="small" themeColor="textSecondary" className="mt-2">
                    Navigating to: {selectedShop.address}, {selectedShop.city}
                  </ThemedText>
                ) : null}
                {isTracking ? (
                  <TouchableOpacity
                    className={`${home.logoutBtn} mt-3`}
                    onPress={stopTracking}
                  >
                    <ThemedText className="font-body text-sm text-destructive">Stop live tracking</ThemedText>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>

          {/* List Section */}
          {shops.length === 0 && searchQuery.trim().length === 0 ? (
            <EmptyState
              icon={<Scissors size={48} color={COLORS.mutedForeground} />}
              title={`No verified shops in ${profile.city} yet.`}
            />
          ) : shops.length === 0 && searchQuery.trim().length > 0 ? (
            <EmptyState
              icon={<Search size={48} color={COLORS.mutedForeground} />}
              title={`No shops match "${searchQuery}" in ${profile.city}.`}
            />
          ) : (
            <FlatList
              data={shops}
              keyExtractor={(item) => item.id}
              style={{ flex: 1 }}
              contentContainerStyle={{ gap: 16, paddingBottom: 100 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={home.shopCard}
                  onPress={() => handleViewShopDetails(item)}
                >
                  <Image source={{ uri: item.banner_url || "https://picsum.photos/400/200" }} className={home.shopBanner} />
                  <View className={home.shopCardDetails}>
                    <View className={home.shopCardHeader}>
                      <ThemedText type="smallBold" className={home.shopName}>
                        {item.name}
                      </ThemedText>
                      <View className={home.ratingBadge}>
                        <Star size={12} color={COLORS.chart4} fill={COLORS.chart4} />
                        <ThemedText type="code" className="ml-1 text-[11px] text-foreground">4.8</ThemedText>
                      </View>
                    </View>
                    <ThemedText themeColor="textSecondary" className="mt-1" numberOfLines={1}>
                      {item.description}
                    </ThemedText>
                    <View className="mt-2 flex-row items-center gap-2">
                      <MapPin size={12} color={COLORS.primary} />
                      <ThemedText type="code" themeColor="textSecondary" className="text-[11px] flex-1">
                        {item.address}
                      </ThemedText>
                      {(() => {
                        const ms = mapShops.find((m: any) => m.id === item.id);
                        return ms?.distance_km != null ? (
                          <ThemedText className={home.shopDistance}>
                            {ms.distance_km.toFixed(1)} km
                          </ThemedText>
                        ) : null;
                      })()}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>

        {/* Shop Detail Overlay Modal */}
        <Modal visible={!!selectedShop} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-background rounded-t-3xl h-[80vh]">
              <SafeAreaView edges={['bottom']} className="flex-1">
                {/* Header bar */}
                <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
                  <ThemedText type="subtitle" className="flex-1" numberOfLines={1}>
                    {shopDetail?.shop?.name || ''}
                  </ThemedText>
                  <HapticPressable
                    haptic="light"
                    onPress={() => { setSelectedShop(null); setShopDetail(null); }}
                    className="w-8 h-8 rounded-full bg-secondary items-center justify-center"
                  >
                    <ThemedText className="text-foreground text-sm">✕</ThemedText>
                  </HapticPressable>
                </View>

                {loadingDetails || !shopDetail ? (
                  <ActivityIndicator size="large" color={COLORS.primary} className="flex-1" />
                ) : (
                  <ScrollView
                    className="flex-1"
                    contentContainerClassName="gap-5 px-5 pb-6"
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Banner */}
                    <Image
                      source={{ uri: shopDetail.shop.banner_url || "https://picsum.photos/400/200" }}
                      className="h-[160px] w-full rounded-xl bg-muted"
                      resizeMode="cover"
                    />

                    {/* Shop info */}
                    <View className="gap-2">
                      <ThemedText type="subtitle">{shopDetail.shop.name}</ThemedText>
                      {shopDetail.shop.description ? (
                        <ThemedText themeColor="textSecondary" className="font-body">
                          {shopDetail.shop.description}
                        </ThemedText>
                      ) : null}
                      <View className="flex-row items-center gap-1.5">
                        <MapPin size={14} color={COLORS.primary} />
                        <ThemedText className="font-body text-sm text-primary">
                          {shopDetail.shop.address}, {shopDetail.shop.city}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-3"
                        onPress={() => startTrackingToShop(shopDetail.shop)}
                      >
                        <ThemedText className="font-body font-bold text-primary">
                          {isTracking ? "Tracking active" : "Live tracking"}
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-3"
                        onPress={() => openExternalNavigation(shopDetail.shop)}
                      >
                        <ThemedText className="font-body font-bold text-primary">
                          Navigate
                        </ThemedText>
                      </TouchableOpacity>
                    </View>

                    {shopDetail.services?.length > 0 && (
                      <TouchableOpacity
                        className="h-12 items-center justify-center rounded-xl bg-primary"
                        onPress={() => {
                          setSelectedShop(null);
                          setShopDetail(null);
                          router.push(`/book/${shopDetail.shop.id}`);
                        }}
                      >
                        <ThemedText className="font-body font-bold text-primary-foreground">
                          Book Appointment
                        </ThemedText>
                      </TouchableOpacity>
                    )}

                    <View className="h-px bg-border" />

                    {/* Services */}
                    {shopDetail.services?.length > 0 && (
                      <>
                        <ThemedText type="smallBold">Services</ThemedText>
                        <View className="gap-2">
                          {shopDetail.services.map((s: any) => (
                            <View key={s.id} className="flex-row items-center justify-between rounded-xl border border-border/50 bg-secondary/40 p-3">
                              <View className="flex-1">
                                <ThemedText className="font-body font-medium">{s.name}</ThemedText>
                                <ThemedText className="font-body text-sm text-muted-foreground">
                                  {s.duration_minutes} min
                                </ThemedText>
                              </View>
                              <ThemedText className="font-body font-bold text-primary">
                                Rs {s.price_pkr}
                              </ThemedText>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    {/* Experts & Specialists */}
                    <ThemedText type="smallBold">Experts & Specialists</ThemedText>
                    {shopDetail.workers.length === 0 ? (
                      <ThemedText themeColor="textSecondary" className="font-body text-center py-4">
                        No specialists registered.
                      </ThemedText>
                    ) : (
                      <View className="gap-3">
                        {shopDetail.workers.map((w: any) => (
                          <View key={w.id} className="flex-row items-center gap-3 rounded-xl border border-border/50 bg-secondary/40 p-3">
                            <Image
                              source={{ uri: w.avatar_url || "https://i.pravatar.cc/100" }}
                              className="h-12 w-12 rounded-full bg-muted"
                            />
                            <View className="flex-1">
                              <ThemedText type="smallBold">{w.name}</ThemedText>
                              <View className="mt-1 flex-row flex-wrap gap-1.5">
                                {(w.specialties || []).map((s: string, idx: number) => (
                                  <View key={idx} className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5">
                                    <ThemedText type="code" className="text-[10px] text-primary">{s}</ThemedText>
                                  </View>
                                ))}
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                )}
              </SafeAreaView>
            </View>
          </View>
        </Modal>
      </ThemedView>
    );
  }

  // 3. RECOVERY UI — no profile loaded (401/network error cleared session)
  if (!profile) {
    return (
      <ThemedView className={home.container}>
        <SafeAreaView className={`${home.safeArea} ${home.emptyState}`}>
          <ThemedText type="subtitle" className="text-center">
            Session expired
          </ThemedText>
          <ThemedText themeColor="textSecondary" className="mt-3 text-center px-6">
            Your session has expired. Please sign in again.
          </ThemedText>
          <TouchableOpacity className={`${home.logoutBtn} mt-6`} onPress={() => signOut()}>
            <ThemedText className="font-body text-sm text-destructive">Sign out</ThemedText>
          </TouchableOpacity>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // 2. BARBER PROFILE DASHBOARD VIEW
  const barberListHeader = (
    <View className={home.listHeader}>
      <View className={home.header}>
        <View className="flex-1 pr-3">
          <ThemedText className={home.welcomeText}>
            {profile?.name?.trim() ? `Hi, ${profile.name.trim()}` : "Barber Dashboard"}
          </ThemedText>
          <ThemedText themeColor="textSecondary" className="mt-1 font-body text-sm">
            Manage your salons & portfolios
          </ThemedText>
        </View>
        <HapticPressable className={home.accountChip} onPress={() => router.push("/profile" as Href)}>
          <ThemedText className="font-body text-sm font-semibold text-primary">Account</ThemedText>
        </HapticPressable>
      </View>

      <DashboardActionCards onAddShop={() => void openAddShop()} />

      <ThemedText type="smallBold" className="mb-4 font-heading text-lg text-foreground">
        My Salons
      </ThemedText>
    </View>
  );

  return (
    <ThemedView className={home.container}>
      <SafeAreaView className="flex-1 px-5">
        <FlatList
          data={myShops}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ gap: 12, paddingBottom: 100, flexGrow: 1 }}
          ListHeaderComponent={barberListHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onBarberRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Scissors size={48} color={COLORS.mutedForeground} />}
              title="No shops registered yet."
            />
          }
          renderItem={({ item }) => <BarberShopCard shop={item} />}
        />

        {/* Add Shop Modal */}
        <Modal visible={addShopVisible} transparent animationType="slide">
          <View className={home.modalOverlay}>
            <View className={home.modalContent}>
              <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
                <ThemedText type="subtitle" className="flex-1">Add Salon Shop</ThemedText>
                <HapticPressable
                  haptic="light"
                  onPress={() => {
                    if (placesDebounceRef.current) clearTimeout(placesDebounceRef.current);
                    setPlacePredictions([]);
                    setAddShopVisible(false);
                  }}
                  className="w-8 h-8 rounded-full bg-secondary items-center justify-center"
                >
                  <ThemedText className="text-foreground text-sm">✕</ThemedText>
                </HapticPressable>
              </View>
              <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
                <TextInput
                  className={home.modalInput}
                  placeholder="Shop Name"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={newShopName}
                  onChangeText={setNewShopName}
                />
                <TextInput
                  className={home.modalInput}
                  placeholder="Description"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={newShopDesc}
                  onChangeText={setNewShopDesc}
                />
                <ShopPhoneInput value={newShopPhone} onChangeValue={setNewShopPhone} />
                <TextInput
                  className={home.modalInput}
                  placeholder="Search address"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={placeSearch}
                  onChangeText={handlePlacesAutocomplete}
                />
                {placePredictions.length > 0 && (
                  <View className="rounded-xl border border-border bg-card p-2">
                    {placePredictions.slice(0, 5).map((prediction) => (
                      <TouchableOpacity
                        key={prediction.placeId}
                        className="px-2 py-2"
                        onPress={() => handleSelectPlace(prediction.placeId)}
                      >
                        <ThemedText type="smallBold">{prediction.mainText}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {prediction.secondaryText}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TextInput
                  className={home.modalInput}
                  placeholder="Address Location"
                  placeholderTextColor={COLORS.mutedForeground}
                  value={newShopAddr}
                  onChangeText={setNewShopAddr}
                />
                <View className="flex-row gap-2">
                  {(["Gujranwala", "Lahore", "Vehari"] as const).map((c) => (
                    <TouchableOpacity
                      key={c}
                      className={`${home.citySelectBtn} ${newShopCity === c ? home.citySelectActive : ""}`}
                      onPress={() => {
                        setNewShopCity(c);
                        setCityPinHint(null);
                      }}
                    >
                      <ThemedText className={`font-body text-sm ${newShopCity === c ? "text-primary" : "text-muted-foreground"}`}>{c}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
                {cityPinHint ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {cityPinHint}
                  </ThemedText>
                ) : null}
                <TouchableOpacity
                  className={home.addBtnSecondary}
                  onPress={async () => {
                    try {
                      const permission = await Location.requestForegroundPermissionsAsync();
                      if (permission.status !== "granted") {
                        appAlert("Permission needed", "Allow location permission to use current location.");
                        return;
                      }
                      const current = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                      });
                      applyShopCoordinates(current.coords.latitude, current.coords.longitude);
                    } catch (err) {
                      console.error("Failed to use current location", err);
                      appAlert("Error", "Unable to fetch current location.");
                    }
                  }}
                >
                  <ThemedText className={home.addBtnTextSecondary}>Use Current Location</ThemedText>
                </TouchableOpacity>
                {addShopMapCamera && Platform.OS !== "web" ? (
                  <ShopLocationMap
                    camera={addShopMapCamera}
                    onCameraChange={setAddShopMapCamera}
                    onCoordinateChange={applyShopCoordinates}
                  />
                ) : null}
                <ThemedText type="small" themeColor="textSecondary">
                  Pan map to place crosshair on your shop. Selected: {newShopLat?.toFixed(5) ?? "-"},{" "}
                  {newShopLng?.toFixed(5) ?? "-"}
                </ThemedText>
                <TouchableOpacity className={home.submitBtn} onPress={handleAddShop}>
                  <ThemedText className="font-body font-bold text-primary-foreground">Submit Registration</ThemedText>
                </TouchableOpacity>
                {myShops.length > 0 && (
                  <TouchableOpacity
                    className={home.addBtnSecondary}
                    onPress={() => locationEditShop && handleUpdateShopLocation(locationEditShop)}
                  >
                    <ThemedText className={home.addBtnTextSecondary}>
                      {locationEditShop ? `Update ${locationEditShop.name} location` : "Select a shop to update location"}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Manage Workers Modal */}
        <Modal visible={!!manageWorkersShop} transparent animationType="slide">
          <View className={home.modalOverlay}>
            <View className={home.modalContent}>
              <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
                <ThemedText type="subtitle" className="flex-1">Manage Specialists</ThemedText>
                <HapticPressable
                  haptic="light"
                  onPress={() => { setManageWorkersShop(null); setShopDetail(null); }}
                  className="w-8 h-8 rounded-full bg-secondary items-center justify-center"
                >
                  <ThemedText className="text-foreground text-sm">✕</ThemedText>
                </HapticPressable>
              </View>

              {loadingDetails || !shopDetail ? (
                <ActivityIndicator size="large" color={COLORS.primary} className="p-10" />
              ) : (
                <FlatList
                  data={shopDetail.workers}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ padding: 24, gap: 16 }}
                  ListHeaderComponent={() => (
                    <View className="mb-5 gap-4">
                      <ThemedText themeColor="textSecondary">Add experts to showcase on your shop profile.</ThemedText>
                      <TextInput
                        className={home.modalInput}
                        placeholder="Expert Name (e.g. Ali)"
                        placeholderTextColor={COLORS.mutedForeground}
                        value={newWorkerName}
                        onChangeText={setNewWorkerName}
                      />
                      <TextInput
                        className={home.modalInput}
                        placeholder="Specialties (comma separated, e.g. Beard, Fade)"
                        placeholderTextColor={COLORS.mutedForeground}
                        value={newWorkerSpecialties}
                        onChangeText={setNewWorkerSpecialties}
                      />
                      <TouchableOpacity className={home.submitBtn} onPress={handleAddWorker}>
                        <ThemedText className="font-body font-bold text-primary-foreground">Add Specialist</ThemedText>
                      </TouchableOpacity>
                      <View className={home.divider} />
                      <ThemedText type="smallBold">Current Workers ({shopDetail.workers.length})</ThemedText>
                    </View>
                  )}
                  renderItem={({ item }) => (
                    <View className={home.workerRow}>
                      <Image source={{ uri: item.avatar_url || "https://i.pravatar.cc/100" }} className={home.workerAvatar} />
                      <View>
                        <ThemedText type="smallBold">{item.name}</ThemedText>
                        <ThemedText type="code" className="mt-1 text-[10px] text-primary">
                          {item.specialties.join(", ")}
                        </ThemedText>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

