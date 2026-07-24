import { useState } from "react";
import { View } from "react-native";
import Animated, { Easing, Keyframe } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { BrandLogo, splashScreenStyle } from "@/components/branded-splash";

const HOLD_MS = 450;
const FADE_MS = 500;
const TOTAL_DURATION = HOLD_MS + FADE_MS;

/** Logo stays visible — matches static BrandedSplash; only overlay fades out. */
const overlayExitKeyframe = new Keyframe({
    0: {
        opacity: 1,
    },
    47: {
        opacity: 1,
    },
    100: {
        opacity: 0,
        easing: Easing.out(Easing.cubic),
    },
});

export function AnimatedSplashOverlay() {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    return (
        <Animated.View
            pointerEvents="none"
            entering={overlayExitKeyframe
                .duration(TOTAL_DURATION)
                .withCallback((finished) => {
                    "worklet";
                    if (finished) {
                        scheduleOnRN(setVisible, false);
                    }
                })}
            style={[
                splashScreenStyle,
                { position: "absolute", inset: 0, zIndex: 1000 },
            ]}
        >
            <View style={{ alignItems: "center", justifyContent: "center" }}>
                <BrandLogo />
            </View>
        </Animated.View>
    );
}
