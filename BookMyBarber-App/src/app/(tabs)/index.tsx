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
import { HapticPressable } from "@/components/ui";
import { COLORS, PLACEHOLDER_COLOR } from "@/constants/design-tokens";
import { home } from "@/constants/home-ui";
import axios from "axios";
import { api } from "@/lib/api";
import { useAuthSession } from "@/contexts/auth-session";
import { autocompletePlaces, getPlaceDetails } from "@/lib/places";
import {
  cameraFromCoords,
  defaultShopMapCamera,
  type MapCameraState,
} from "@/lib/map-camera";
import { toPakistanE164 } from "@/lib/pakistan-phone";
import { formatApiError } from "@/lib/network-error";
import { appAlert } from "@/lib/app-alert";
import { getNearbyShops, getRoutePath, reverseGeocode, updateShopLocation } from "@/lib/shops";

export type MapLocationMode = "gps" | "city_fallback" | "permission_denied";

const CITY_COORDS: Record<"Gujranwala" | "Lahore" | "Vehari", { latitude: number; longitude: number }> = {
  Gujranwala: { latitude: 32.1877, longitude: 74.1945 },
  Lahore: { latitude: 31.5204, longitude: 74.3587 },
  Vehari: { latitude: 30.0445, longitude: 72.3556 },
};

export default function HomeScreen() {
  const { status, user, signOut } = useAuthSession();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Customer state
  const [shops, setShops] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [myShops, setMyShops] = useState<any[]>([]);
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
    };
  }, []);

  useEffect(() => {
    if (!addShopVisible) return;
    if (newShopLat !== null && newShopLng !== null) return;
    setAddShopMapCamera(getCityFallbackCamera(newShopCity));
  }, [addShopVisible, newShopCity, newShopLat, newShopLng]);

  const fetchProfileAndData = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const { data } = await api.get("/app/profile");
      setProfile(data.profile);

      if (data.profile.role === "customer") {
        fetchCustomerShops(data.profile.city);
        fetchNearbyShops();
      } else if (data.profile.role === "barber") {
        fetchBarberShops();
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          await signOut();
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
      if (!query) {
        setShops(data.shops || []);
      }
    } catch (err) {
      console.error("Failed to load nearby shops", err);
      appAlert("Could not load nearby shops", formatApiError(err, "Try again in a moment."), undefined, {
        variant: "error",
      });
    }
  };

  const fetchCustomerShops = async (city: string, query = "") => {
    try {
      const { data } = await api.get("/app/shops/search", {
        params: { city, query: query || undefined },
      });
      setShops(data.shops || []);
    } catch (err) {
      console.error("Failed to search shops", err);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (profile) {
      fetchCustomerShops(profile.city, text);
      fetchNearbyShops(text);
    }
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
      const { data } = await api.get("/app/shops/my");
      setMyShops(data.shops || []);
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

          {/* Search bar */}
          <View className={home.searchSection}>
            <Search size={18} color="#676F7E" className={home.searchIcon} />
            <TextInput
              className={home.searchInput}
              placeholder="Search barber shops..."
              placeholderTextColor="#676F7E"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          <View className="mb-4">
            <ThemedText type="smallBold" className="mb-2">
              Nearby on map ({radiusKm} km)
            </ThemedText>
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
          </View>

          {/* List Section */}
          <ThemedText type="subtitle" className={home.sectionTitle}>
            Available Barber Shops
          </ThemedText>

          {shops.length === 0 ? (
            <View className={home.emptyState}>
              <Scissors size={48} color="#676F7E" />
              <ThemedText themeColor="textSecondary" className="mt-3">
                No verified shops in {profile.city} matching queries.
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={shops}
              keyExtractor={(item) => item.id}
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
                        <Star size={12} color="#E8C468" fill="#E8C468" />
                        <ThemedText type="code" className="ml-1 text-[11px] text-foreground">4.8</ThemedText>
                      </View>
                    </View>
                    <ThemedText themeColor="textSecondary" className="mt-1" numberOfLines={1}>
                      {item.description}
                    </ThemedText>
                    <ThemedText type="code" themeColor="textSecondary" className="mt-2 text-[11px]">
                      📍 {item.address}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>

        {/* Shop Detail Overlay Modal */}
        <Modal visible={!!selectedShop} transparent animationType="slide">
          <View className={home.modalOverlay}>
            <View className={home.modalContent}>
              <TouchableOpacity className={home.closeModalBtn} onPress={() => { setSelectedShop(null); setShopDetail(null); }}>
                <X size={20} color="#14181F" />
              </TouchableOpacity>

              {loadingDetails || !shopDetail ? (
                <ActivityIndicator size="large" color={COLORS.primary} className="p-10" />
              ) : (
                <ScrollView>
                  <Image source={{ uri: shopDetail.shop.banner_url || "https://picsum.photos/400/200" }} className={home.modalBanner} />
                  <View className={home.modalBody}>
                    <ThemedText type="subtitle">
                      {shopDetail.shop.name}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" className="my-2">
                      {shopDetail.shop.description}
                    </ThemedText>
                    <ThemedText className="my-1 font-body text-primary">
                      📍 {shopDetail.shop.address}, {shopDetail.shop.city}
                    </ThemedText>
                    <View className="mt-2 flex-row gap-2">
                      <TouchableOpacity
                        className={home.addBtnSecondary}
                        onPress={() => startTrackingToShop(shopDetail.shop)}
                      >
                        <ThemedText className={home.addBtnTextSecondary}>
                          {isTracking ? "Tracking active" : "Start live tracking"}
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={home.addBtnSecondary}
                        onPress={() => openExternalNavigation(shopDetail.shop)}
                      >
                        <ThemedText className={home.addBtnTextSecondary}>Navigate to shop</ThemedText>
                      </TouchableOpacity>
                    </View>

                    <View className={home.divider} />

                    <ThemedText type="smallBold" className="mb-3">
                      Experts & Specialists
                    </ThemedText>

                    {shopDetail.services?.length > 0 && (
                      <>
                        <ThemedText type="smallBold" className="mb-2">
                          Services
                        </ThemedText>
                        {shopDetail.services.map((s: any) => (
                          <ThemedText key={s.id} type="small" themeColor="textSecondary" className="mb-1">
                            {s.name} — Rs {s.price_pkr} ({s.duration_minutes} min)
                          </ThemedText>
                        ))}
                        <TouchableOpacity
                          className={`${home.submitBtn} mt-3`}
                          onPress={() => {
                            setSelectedShop(null);
                            router.push(`/book/${shopDetail.shop.id}`);
                          }}
                        >
                          <ThemedText className="font-body font-bold text-primary-foreground">Book Appointment</ThemedText>
                        </TouchableOpacity>
                        <View className={home.divider} />
                      </>
                    )}

                    {shopDetail.workers.length === 0 ? (
                      <ThemedText themeColor="textSecondary">No specialists registered.</ThemedText>
                    ) : (
                      shopDetail.workers.map((w: any) => (
                        <View key={w.id} className={home.workerRow}>
                          <Image source={{ uri: w.avatar_url || "https://i.pravatar.cc/100" }} className={home.workerAvatar} />
                          <View className="flex-1">
                            <ThemedText type="smallBold">{w.name}</ThemedText>
                            <View className={home.tagContainer}>
                              {w.specialties.map((s: string, idx: number) => (
                                <View key={idx} className={home.specialtyTag}>
                                  <ThemedText type="code" className="text-[10px] text-primary">{s}</ThemedText>
                                </View>
                              ))}
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
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
            Manage shops & specialist portfolios
          </ThemedText>
        </View>
        <HapticPressable className={home.accountChip} onPress={() => router.push("/profile" as Href)}>
          <ThemedText className="font-body text-sm font-semibold text-primary">Account</ThemedText>
        </HapticPressable>
      </View>

      <DashboardActionCards onAddShop={() => void openAddShop()} />

      <ThemedText type="smallBold" className="mb-3 font-heading text-lg text-foreground">
        My Registered Shops
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
          contentContainerStyle={{ gap: 16, paddingBottom: 100, flexGrow: 1 }}
          ListHeaderComponent={barberListHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onBarberRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View className={home.emptyState}>
              <Scissors size={48} color={PLACEHOLDER_COLOR} />
              <ThemedText themeColor="textSecondary" className="mt-3">
                No registered shops. Add your shop above.
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <View className={home.barberShopCard}>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <ThemedText type="smallBold">{item.name}</ThemedText>
                  <View
                    className={`${home.statusBadge} ${item.status === "approved" ? home.bgApproved : home.bgPending}`}
                  >
                    <ThemedText type="code" className="text-[9px] text-primary-foreground">
                      {item.status}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText themeColor="textSecondary" className="mt-1">
                  {item.address}, {item.city}
                </ThemedText>
              </View>
              <TouchableOpacity className={home.manageBtn} onPress={() => handleManageWorkers(item)}>
                <ThemedText type="code" className="text-[11px] text-primary">
                  Workers
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                className={`${home.manageBtn} ml-2`}
                onPress={async () => {
                  setNewShopAddr(item.address);
                  setNewShopCity(item.city);
                  const itemLat = item.latitude ? Number(item.latitude) : null;
                  const itemLng = item.longitude ? Number(item.longitude) : null;
                  setNewShopLat(itemLat);
                  setNewShopLng(itemLng);
                  setLocationEditShop(item);
                  placesConfigAlertShownRef.current = false;
                  await initializeAddShopMap(item.city, itemLat, itemLng);
                  setAddShopVisible(true);
                }}
              >
                <ThemedText type="code" className="text-[11px] text-primary">
                  Location
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        />

        {/* Add Shop Modal */}
        <Modal visible={addShopVisible} transparent animationType="slide">
          <View className={home.modalOverlay}>
            <View className={home.modalContent}>
              <TouchableOpacity
                className={home.closeModalBtn}
                onPress={() => {
                  if (placesDebounceRef.current) clearTimeout(placesDebounceRef.current);
                  setPlacePredictions([]);
                  setAddShopVisible(false);
                }}
              >
                <X size={20} color="#14181F" />
              </TouchableOpacity>
              <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
                <ThemedText type="subtitle">Add Salon Shop</ThemedText>
                <TextInput
                  className={home.modalInput}
                  placeholder="Shop Name"
                  placeholderTextColor="#676F7E"
                  value={newShopName}
                  onChangeText={setNewShopName}
                />
                <TextInput
                  className={home.modalInput}
                  placeholder="Description"
                  placeholderTextColor="#676F7E"
                  value={newShopDesc}
                  onChangeText={setNewShopDesc}
                />
                <ShopPhoneInput value={newShopPhone} onChangeValue={setNewShopPhone} />
                <TextInput
                  className={home.modalInput}
                  placeholder="Search address"
                  placeholderTextColor="#676F7E"
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
                  placeholderTextColor="#676F7E"
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
              <TouchableOpacity className={home.closeModalBtn} onPress={() => { setManageWorkersShop(null); setShopDetail(null); }}>
                <X size={20} color="#14181F" />
              </TouchableOpacity>

              {loadingDetails || !shopDetail ? (
                <ActivityIndicator size="large" color={COLORS.primary} className="p-10" />
              ) : (
                <FlatList
                  data={shopDetail.workers}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ padding: 24, gap: 16 }}
                  ListHeaderComponent={() => (
                    <View className="mb-5 gap-4">
                      <ThemedText type="subtitle">Manage Specialists</ThemedText>
                      <ThemedText themeColor="textSecondary">Add experts to showcase on your shop profile.</ThemedText>
                      <TextInput
                        className={home.modalInput}
                        placeholder="Expert Name (e.g. Ali)"
                        placeholderTextColor="#676F7E"
                        value={newWorkerName}
                        onChangeText={setNewWorkerName}
                      />
                      <TextInput
                        className={home.modalInput}
                        placeholder="Specialties (comma separated, e.g. Beard, Fade)"
                        placeholderTextColor="#676F7E"
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

