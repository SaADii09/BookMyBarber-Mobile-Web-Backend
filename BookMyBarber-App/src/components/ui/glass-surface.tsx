import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Platform, View, type ViewProps } from 'react-native';

export type GlassSurfaceProps = ViewProps & {
  /** Blur intensity when falling back to expo-blur (Android / unsupported iOS). */
  intensity?: number;
  blurTint?: 'light' | 'dark' | 'default';
};

export function GlassSurface({
  children,
  style,
  intensity = 50,
  blurTint = 'dark',
  ...props
}: GlassSurfaceProps) {
  const useNativeGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

  if (useNativeGlass) {
    return (
      <GlassView glassEffectStyle="regular" style={style} {...props}>
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          style,
          { backgroundColor: 'rgba(33, 34, 37, 0.72)', backdropFilter: 'blur(12px)' as never },
        ]}
        {...props}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} tint={blurTint} style={style} {...props}>
      {children}
    </BlurView>
  );
}
