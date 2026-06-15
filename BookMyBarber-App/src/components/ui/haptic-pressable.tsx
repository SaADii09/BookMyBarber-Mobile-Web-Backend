import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps } from 'react-native';

export type HapticStrength = 'light' | 'medium' | 'none';

export type HapticPressableProps = PressableProps & {
  /** `light` for standard taps; `medium` for primary CTAs; `none` to disable. */
  haptic?: HapticStrength;
};

function triggerHaptic(strength: HapticStrength) {
  if (strength === 'none') return;
  const style =
    strength === 'medium'
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Light;
  void Haptics.impactAsync(style);
}

export function HapticPressable({
  haptic = 'light',
  onPressIn,
  ...props
}: HapticPressableProps) {
  return (
    <Pressable
      onPressIn={(event) => {
        triggerHaptic(haptic);
        onPressIn?.(event);
      }}
      {...props}
    />
  );
}
