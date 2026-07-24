import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, Image, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { PrimaryButton } from '@/components/ui';
import { COLORS } from '@/constants/design-tokens';
import { screen } from '@/constants/ui-classes';
import { useAuthSession } from '@/contexts/auth-session';
import { capturedPhotos } from '@/lib/captured-photos';

const STEPS = ['Front', 'Left side', 'Right side'] as const;
const INSTRUCTIONS = [
  'Position your face inside the oval, facing the camera',
  'Turn your head to the left, keep face in the oval',
  'Turn your head to the right, keep face in the oval',
] as const;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const OVAL_WIDTH = SCREEN_WIDTH * 0.6;
const OVAL_HEIGHT = OVAL_WIDTH * 1.3;

export default function CaptureScreen() {
  const { status } = useAuthSession();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'guest') router.replace('/(auth)/login' as any);
  }, [status]);

  if (status === 'loading' || status === 'guest') {
    return (
      <SafeAreaView className={screen.center}>
        <ThemedText className="text-muted-foreground">Loading...</ThemedText>
      </SafeAreaView>
    );
  }

  if (!permission) return <View style={{ flex: 1, backgroundColor: 'black' }} />;

  if (!permission.granted) {
    return (
      <SafeAreaView className={screen.center}>
        <SymbolView name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } as const} size={48} tintColor={COLORS.mutedForeground} />
        <ThemedText type="title" className="text-foreground mt-4">
          Camera access required
        </ThemedText>
        <ThemedText type="default" className="text-muted-foreground mt-2 text-center px-8">
          We need your camera to take portrait photos for style analysis
        </ThemedText>
        <PrimaryButton onPress={requestPermission} className="mt-6 mx-8">
          <ThemedText className="font-body font-semibold text-primary-foreground">
            Grant Permission
          </ThemedText>
        </PrimaryButton>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <ThemedText className="text-muted-foreground">Go back</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const takePhoto = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) {
      setPreviewUri(photo.uri);
    }
  };

  const confirmPhoto = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const next = [...photos, previewUri!];
    setPhotos(next);
    setPreviewUri(null);

    if (step < 2) {
      setStep(step + 1);
      setFacing(step === 0 ? 'back' : 'front');
    } else {
      capturedPhotos.set(next);
      router.back();
    }
  };

  const retakePhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreviewUri(null);
  };

  const toggleFacing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  };

  // Preview mode
  if (previewUri) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Image source={{ uri: previewUri }} style={{ flex: 1 }} resizeMode="cover" />
        {/* Face guide overlay */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
          <View
            style={{
              width: OVAL_WIDTH,
              height: OVAL_HEIGHT,
              borderRadius: OVAL_WIDTH / 2,
              borderWidth: 2,
              borderColor: COLORS.primary,
              opacity: 0.7,
            }}
          />
          <ThemedText
            type="small"
            style={{ color: 'white', marginTop: 12, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4 }}
          >
            Is your face clearly visible in the guide?
          </ThemedText>
        </View>
        {/* Step label */}
        <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' }}>
          <GlassSurface intensity={60} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
            <ThemedText type="smallBold" style={{ color: 'white' }}>
              {STEPS[step]} — Preview
            </ThemedText>
          </GlassSurface>
        </View>
        {/* Action buttons */}
        <View style={{ position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 20, paddingHorizontal: 32 }}>
          <GlassSurface intensity={60} style={{ borderRadius: 99 }}>
            <TouchableOpacity onPress={retakePhoto} style={{ paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SymbolView name={{ ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' } as const} size={18} tintColor="white" />
              <ThemedText type="smallBold" style={{ color: 'white' }}>Retake</ThemedText>
            </TouchableOpacity>
          </GlassSurface>
          <GlassSurface intensity={60} style={{ borderRadius: 99 }}>
            <TouchableOpacity onPress={confirmPhoto} style={{ paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary + 'CC', borderRadius: 99 }}>
              <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' } as const} size={18} tintColor="white" />
              <ThemedText type="smallBold" style={{ color: 'white' }}>{step < 2 ? 'Next' : 'Done'}</ThemedText>
            </TouchableOpacity>
          </GlassSurface>
        </View>
      </View>
    );
  }

  // Camera mode — overlays as siblings, not children of CameraView
  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView ref={cameraRef} mirror style={{ flex: 1 }} facing={facing} />

      {/* Step label */}
      <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
        <GlassSurface intensity={60} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
          <ThemedText type="smallBold" style={{ color: 'white' }}>
            Step {step + 1} of 3 — {STEPS[step]}
          </ThemedText>
        </GlassSurface>
      </View>

      {/* Step dots */}
      <View style={{ position: 'absolute', top: 100, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 }} pointerEvents="none">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i <= step ? COLORS.primary : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </View>

      {/* Face guide oval */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
        <View
          style={{
            width: OVAL_WIDTH,
            height: OVAL_HEIGHT,
            borderRadius: OVAL_WIDTH / 2,
            borderWidth: 2,
            borderColor: COLORS.primary,
            borderStyle: 'dashed',
          }}
        />
        <ThemedText
          type="small"
          style={{ color: 'white', marginTop: 16, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, textAlign: 'center', paddingHorizontal: 40 }}
        >
          {INSTRUCTIONS[step]}
        </ThemedText>
      </View>

      {/* Bottom controls */}
      <View style={{ position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center', gap: 16 }}>
        {/* Photos taken indicator */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {photos.map((uri, i) => (
            <View key={i} style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.primary }}>
              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
            </View>
          ))}
          {Array.from({ length: 3 - photos.length }).map((_, i) => (
            <View
              key={`empty-${i}`}
              style={{ width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed' }}
            />
          ))}
        </View>

        {/* Capture button */}
        <GlassSurface intensity={60} style={{ borderRadius: 99 }}>
          <TouchableOpacity onPress={takePhoto} style={{ width: 68, height: 68, borderRadius: 99, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: 58, height: 58, borderRadius: 99, borderWidth: 3, borderColor: 'black' }} />
          </TouchableOpacity>
        </GlassSurface>

        {/* Flip + Close */}
        <View style={{ flexDirection: 'row', gap: 32, marginTop: 4 }}>
          <GlassSurface intensity={60} style={{ borderRadius: 99 }}>
            <TouchableOpacity onPress={toggleFacing} style={{ padding: 12, borderRadius: 99 }}>
              <SymbolView name={{ ios: 'arrow.triangle.2.circlepath', android: 'flip_camera_android', web: 'sync' } as const} size={24} tintColor="white" />
            </TouchableOpacity>
          </GlassSurface>
          <GlassSurface intensity={60} style={{ borderRadius: 99 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 12, borderRadius: 99 }}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' } as const} size={24} tintColor="white" />
            </TouchableOpacity>
          </GlassSurface>
        </View>
      </View>
    </View>
  );
}
