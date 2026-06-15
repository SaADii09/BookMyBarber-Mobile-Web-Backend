import { View, StyleSheet } from "react-native";
import { MapPin } from "lucide-react-native";

import { ThemedText } from "@/components/themed-text";
import { COLORS } from "@/constants/design-tokens";

type MapUnavailableProps = {
  variant?: "nearby" | "picker";
  height?: number;
};

export function MapUnavailable({ variant = "nearby", height }: MapUnavailableProps) {
  const boxHeight = height ?? (variant === "picker" ? 240 : 220);
  return (
    <View style={[styles.box, { height: boxHeight }]}>
      <MapPin size={28} color={COLORS.primary} />
      <ThemedText type="smallBold" className="mt-2 text-center">
        Map needs a development build
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" className="mt-1 text-center px-4">
        Expo Go cannot load MapLibre. Run npx expo run:android after setting
        EXPO_PUBLIC_MAPTILER_API_KEY in .env. Use Current Location or address search to set
        shop coordinates until then.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
});
