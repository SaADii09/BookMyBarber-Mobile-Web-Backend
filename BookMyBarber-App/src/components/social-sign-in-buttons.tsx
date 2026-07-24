import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { COLORS } from "@/constants/design-tokens";

export function SocialSignInButtons() {
    return (
        <View className="gap-3">
            <View className="flex-row items-center gap-3">
                <View className="flex-1 h-px bg-border" />
                <Text className="font-body text-sm text-muted-foreground">
                    or
                </Text>
                <View className="flex-1 h-px bg-border" />
            </View>

            <View className="h-12 flex-row items-center justify-between rounded-xl border border-border bg-card px-4 opacity-50">
                <View className="flex-row items-center gap-3">
                    <Ionicons
                        name="logo-google"
                        size={20}
                        color={COLORS.mutedForeground}
                    />
                    <Text className="font-body text-sm text-muted-foreground">
                        Continue with Google
                    </Text>
                </View>
                <View className="rounded-full bg-muted px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-muted-foreground">
                        Coming soon
                    </Text>
                </View>
            </View>

            <View className="h-12 flex-row items-center justify-between rounded-xl border border-border bg-card px-4 opacity-50">
                <View className="flex-row items-center gap-3">
                    <Ionicons
                        name="logo-microsoft"
                        size={20}
                        color={COLORS.mutedForeground}
                    />
                    <Text className="font-body text-sm text-muted-foreground">
                        Continue with Microsoft
                    </Text>
                </View>
                <View className="rounded-full bg-muted px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-muted-foreground">
                        Coming soon
                    </Text>
                </View>
            </View>
        </View>
    );
}
