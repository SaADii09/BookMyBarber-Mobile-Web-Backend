import Constants from "expo-constants";
import { Platform } from "react-native";

/** MapLibre requires a dev build (`expo run:android`); not available in Expo Go. */
export function isMapNativeModuleExpected(): boolean {
  if (Platform.OS === "web") return false;
  return Constants.appOwnership !== "expo";
}
