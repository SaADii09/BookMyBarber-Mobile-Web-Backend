import { Image } from "expo-image";
import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

import { COLORS } from "@/constants/design-tokens";

export const BRAND_LOGO_SIZE = process.env.EXPO_OS === "android" ? 200 : 220;

/** Light asset only — white scissors on terracotta mark. Never use *-dark.png. */
const brandLogoSource = require("@/assets/images/brand/ios-1024-light.png");

const splashScreenStyle: ViewStyle = {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.splashBackground,
};

export function BrandLogo() {
    return (
        <Image
            source={brandLogoSource}
            style={{ width: BRAND_LOGO_SIZE, height: BRAND_LOGO_SIZE }}
            contentFit="contain"
            accessibilityLabel="BookMyBarber"
        />
    );
}

type BrandedSplashProps = {
    logo?: ReactNode;
};

export function BrandedSplash({ logo }: BrandedSplashProps) {
    return <View style={splashScreenStyle}>{logo ?? <BrandLogo />}</View>;
}

export { splashScreenStyle };
