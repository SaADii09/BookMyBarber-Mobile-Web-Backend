import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Image, ScrollView, ActivityIndicator, Dimensions, Modal, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable, PrimaryButton } from '@/components/ui';
import { GlassSurface } from '@/components/ui/glass-surface';
import { card, screen } from '@/constants/ui-classes';
import { appAlert } from '@/lib/app-alert';
import { api, TOKEN_STORAGE_KEY } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthSession } from '@/contexts/auth-session';
import { COLORS } from '@/constants/design-tokens';
import { SymbolView } from 'expo-symbols';
import { capturedPhotos } from '@/lib/captured-photos';
import { useHaircutStatus } from '@/hooks/use-haircut-status';

const PHOTO_LABELS = ['Front', 'Left side', 'Right side'] as const;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 56) / 3;
const CARD_HEIGHT = CARD_WIDTH * 1.3;
const OVAL_WIDTH = CARD_WIDTH * 0.7;

function getMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

interface AiAnalysisResult {
  id: string;
  face_shape: string;
  suggested_haircut: string;
  analysis_details: string;
  styling_reason: string | null;
  generated_image_url: string | null;
  photo_1_url: string;
  photo_2_url: string;
  photo_3_url: string;
  created_at: string;
}

export default function StyleGuideScreen() {
  const { status } = useAuthSession();
  const params = useLocalSearchParams<{ captureSlot?: string; captureUri?: string }>();

  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState<AiAnalysisResult[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  // Realtime subscription for active haircut request
  const haircutRequest = useHaircutStatus(activeRequestId);

  // Progress bar
  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const [progressText, setProgressText] = useState('');
  // Modals
  const [sourceModalIndex, setSourceModalIndex] = useState<number | null>(null);
  const [editModalIndex, setEditModalIndex] = useState<number | null>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [singleCameraSlot, setSingleCameraSlot] = useState<number | null>(null);
  const [historyViewerUri, setHistoryViewerUri] = useState<string | null>(null);

  // Receive photos from capture screen via module-level store
  useFocusEffect(
    useCallback(() => {
      const captured = capturedPhotos.consume();
      if (captured && captured.length === 3) {
        setPhotos(captured);
      }
    }, [])
  );

  // Fetch past analyses
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setAnalysesLoading(true);
      api
        .get<{ analyses: AiAnalysisResult[] }>('/app/ai/analyses')
        .then(({ data }) => {
          if (!cancelled) setAnalyses(data.analyses ?? []);
        })
        .catch(() => {
          if (!cancelled) setAnalyses([]);
        })
        .finally(() => {
          if (!cancelled) setAnalysesLoading(false);
        });
      return () => { cancelled = true; };
    }, [])
  );

  // Receive single captured photo from camera screen
  useEffect(() => {
    if (params.captureSlot && params.captureUri) {
      const slot = parseInt(params.captureSlot, 10);
      if (!isNaN(slot) && slot >= 0 && slot <= 2) {
        const next: (string | null)[] = [...photos];
        next[slot] = params.captureUri;
        setPhotos(next);
      }
      router.replace('/style-guide');
    }
  }, [params.captureSlot, params.captureUri]);

  useEffect(() => {
    if (status === 'guest') router.replace('/(auth)/login' as any);
  }, [status]);

  // Handle Realtime status updates from haircut_request
  useEffect(() => {
    if (!haircutRequest) return;

    const statusMap: Record<string, string> = {
      pending: 'Queuing your request...',
      analyzing: 'AI is analyzing your face...',
      queued: 'Waiting in queue...',
      processing: 'Generating your new look...',
      completed: 'Done!',
      failed: 'Generation failed',
    };

    if (statusMap[haircutRequest.status]) {
      setProgressText(statusMap[haircutRequest.status]);
    }

    // Update progress bar based on real status
    const pctMap: Record<string, number> = {
      pending: 0.1,
      analyzing: 0.3,
      queued: 0.5,
      processing: 0.75,
      completed: 1.0,
      failed: 1.0,
    };
    progressAnim.setValue(pctMap[haircutRequest.status] ?? 0);

    if (haircutRequest.status === 'completed') {
      setLoading(false);
      setActiveRequestId(null);

      // Build result from haircut_request data
      const result: AiAnalysisResult = {
        id: haircutRequest.id,
        face_shape: haircutRequest.face_shape ?? '',
        suggested_haircut: haircutRequest.haircut_title ?? '',
        analysis_details: haircutRequest.stylist_recommendation ?? '',
        styling_reason: haircutRequest.stylist_recommendation,
        generated_image_url: haircutRequest.result_image_url,
        photo_1_url: haircutRequest.front_image_url,
        photo_2_url: haircutRequest.left_image_url,
        photo_3_url: haircutRequest.right_image_url,
        created_at: haircutRequest.created_at,
      };
      setResult(result);

      // Update existing optimistic record or prepend new one
      setAnalyses((prev) => {
        const existingIdx = prev.findIndex((a) => a.id === haircutRequest.id || a.suggested_haircut === 'Analyzing...');
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = result;
          return next;
        }
        return [result, ...prev];
      });
    }

    if (haircutRequest.status === 'failed') {
      setLoading(false);
      setActiveRequestId(null);
      appAlert('Generation failed', haircutRequest.error_message ?? 'Something went wrong. Please try again.');
    }
  }, [haircutRequest]);

  if (status === 'loading' || status === 'guest') {
    return (
      <SafeAreaView className={screen.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  // --- Single camera with guide ---

  const openSingleCamera = (slotIndex: number) => {
    setSourceModalIndex(null);
    setSingleCameraSlot(slotIndex);
  };

  const onSingleCameraCapture = (uri: string) => {
    const slot = singleCameraSlot!;
    const next: (string | null)[] = [...photos];
    next[slot] = uri;
    setPhotos(next);
    setSingleCameraSlot(null);
  };

  // --- Single image pick from slot ---

  const pickFromGallery = async (slotIndex: number) => {
    setSourceModalIndex(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      appAlert('Permission needed');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      const next: (string | null)[] = [...photos];
      next[slotIndex] = res.assets[0].uri;
      setPhotos(next);
    }
  };

  // --- Multi-image pick from main button ---

  const pickMultipleFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      appAlert('Permission needed');
      return;
    }
    const slotsNeeded = photos.filter((p) => !p).length;
    if (slotsNeeded <= 0) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: slotsNeeded,
    });
    if (!res.canceled && res.assets.length > 0) {
      const picked = res.assets.map((a) => a.uri);
      setPhotos((prev) => {
        const next = [...prev];
        let pickIdx = 0;
        for (let i = 0; i < 3 && pickIdx < picked.length; i++) {
          if (!next[i]) next[i] = picked[pickIdx++];
        }
        return next;
      });
    }
  };

  // --- Edit actions ---

  const cropPhoto = async (index: number) => {
    setEditModalIndex(null);
    try {
      const cropped = await CropPicker.openCropper({
        path: photos[index]!,
        width: 512,
        height: 512,
        cropping: true,
        cropperToolbarTitle: 'Adjust face position',
        showCropGuidelines: true,
        freeStyleCropEnabled: true,
      });
      const next: (string | null)[] = [...photos];
      next[index] = cropped.path;
      setPhotos(next);
    } catch {
      // ponytail: user cancelled crop
    }
  };

  const removePhoto = (index: number) => {
    setEditModalIndex(null);
    setPhotos((p) => {
      const next = [...p];
      next[index] = null;
      return next;
    });
  };

  // --- Analyze ---

  const analyze = async () => {
    const filled = photos.filter(Boolean) as string[];
    if (filled.length < 3) {
      appAlert('Add 3 portrait photos');
      return;
    }

    // Client-side duplicate check (compare URIs)
    const seen = new Set<string>();
    for (let i = 0; i < filled.length; i++) {
      if (seen.has(filled[i])) {
        appAlert(`Photos ${i + 1} is a duplicate`, 'Please use 3 different portrait photos.');
        return;
      }
      seen.add(filled[i]);
    }

    // Snapshot photos before clearing (for optimistic record)
    const submittedPhotos = [...filled];

    setLoading(true);
    progressAnim.setValue(0);
    setProgressText('Uploading photos...');

    try {
      const form = new FormData();
      filled.forEach((uri, i) => {
        form.append('photos', {
          uri,
          name: `photo${i}.${uri.split('.').pop() ?? 'jpg'}`,
          type: getMimeType(uri),
        } as unknown as Blob);
      });
      form.append('customerPrompt', 'Suggest a modern haircut for my face shape');

      // Real upload progress via XMLHttpRequest (0% → 80%)
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      const baseUrl = api.defaults.baseURL;

      const data = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${baseUrl}/app/ai/analyze`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const uploadPct = e.loaded / e.total;
            const mapped = Math.min(uploadPct * 0.8, 0.8); // 0% → 80%
            progressAnim.setValue(mapped);
            if (uploadPct < 1) {
              setProgressText('Uploading photos...');
            } else {
              setProgressText('Photos uploaded, analyzing...');
            }
          }
        };

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(json);
            } else {
              reject({ response: { data: json, status: xhr.status } });
            }
          } catch {
            reject({ response: { data: { message: 'Invalid response' } } });
          }
        };

        xhr.onerror = () => reject({ response: { data: { message: 'Network error' } } });
        xhr.ontimeout = () => reject({ response: { data: { message: 'Request timed out' } } });
        xhr.timeout = 120_000;
        xhr.send(form);
      });

      // Clear photos immediately after successful submit
      setPhotos([null, null, null]);

      // Check if response is async (queue pipeline) or sync (legacy)
      if (data.request_id) {
        // ASYNC: create optimistic pending record in analyses list
        const optimistic: AiAnalysisResult = {
          id: data.analysis_id ?? data.request_id,
          face_shape: '',
          suggested_haircut: 'Analyzing...',
          analysis_details: '',
          styling_reason: null,
          generated_image_url: null,
          photo_1_url: submittedPhotos[0],
          photo_2_url: submittedPhotos[1],
          photo_3_url: submittedPhotos[2],
          created_at: new Date().toISOString(),
        };
        setAnalyses((prev) => [optimistic, ...prev]);

        // Subscribe to Realtime and let the useEffect handle the rest
        setActiveRequestId(data.request_id);
        setProgressText('Request submitted, analyzing...');
        progressAnim.setValue(0.82);

        // Show success feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        appAlert('Submitted!', 'Your photos are being analyzed. This may take a minute.');

        return; // don't set loading=false — Realtime will handle it
      }

      // SYNC: legacy Gemini-only pipeline
      progressAnim.setValue(1);
      setProgressText('Done!');

      setResult(data.analysis);
      setAnalyses((prev) => [data.analysis, ...prev]);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      appAlert('Analysis complete!', 'Check out your personalized haircut suggestion below.');
    } catch (err: unknown) {
      const responseData = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; code?: string } } }).response?.data
        : undefined;

      const code = responseData?.code;
      const message = responseData?.message;

      if (code === 'INVALID_PHOTOS') {
        appAlert('Photo issue detected', message ?? 'One or more photos could not be analyzed. Retake with clear, well-lit portraits.');
      } else if (code === 'CONTENT_FILTERED') {
        appAlert('Content flagged', message ?? 'One or more photos were flagged. Use appropriate portrait photos only.');
      } else if (code === 'RATE_LIMITED') {
        appAlert('Too many requests', 'Please wait a moment before trying again.');
      } else if (code === 'AI_UNAVAILABLE') {
        appAlert('AI unavailable', 'The analysis service is temporarily down. Please try again later.');
      } else if (code === 'AI_MODEL_UNAVAILABLE') {
        appAlert('AI model unavailable', 'The AI model is not available. Please contact support.');
      } else if (code === 'AI_CONFIG_ERROR') {
        appAlert('AI misconfigured', 'The AI service is misconfigured. Please contact support.');
      } else if (code === 'DUPLICATE_PHOTOS') {
        appAlert('Duplicate photos', message ?? 'You uploaded the same photo twice. Use 3 different portraits.');
      } else if (code === 'INVALID_FILE_TYPE') {
        appAlert('Invalid file type', message ?? 'Only JPEG, PNG, and WebP images are accepted.');
      } else if (code === 'FILE_TOO_SMALL') {
        appAlert('File too small', message ?? 'The image is too small to be a valid photo.');
      } else {
        appAlert('Analysis failed', message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Single guided camera ---

  if (singleCameraSlot !== null) {
    return (
      <SingleGuidedCamera
        slotIndex={singleCameraSlot}
        onCapture={onSingleCameraCapture}
        onCancel={() => setSingleCameraSlot(null)}
      />
    );
  }

  return (
    <SafeAreaView className={screen.root}>
      <Stack.Screen options={{ title: 'AI Style Guide', headerShown: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName={screen.scrollContent}>
        <ThemedText type="title" className="text-foreground">
          AI Style Guide
        </ThemedText>
        <ThemedText type="default" className="text-muted-foreground mt-1">
          Add 3 portraits (front, left side, right side) for personalized haircut suggestions
        </ThemedText>

        {/* Horizontal photo cards */}
        <View className="flex-row gap-2 mt-4">
          {[0, 1, 2].map((i) => {
            const uri = photos[i];
            const label = PHOTO_LABELS[i];

            if (uri) {
              return (
                <HapticPressable
                  key={i}
                  haptic="light"
                  onPress={() => setEditModalIndex(i)}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                  style={{ width: CARD_WIDTH }}
                >
                  <Image source={{ uri }} style={{ width: CARD_WIDTH, height: CARD_HEIGHT }} resizeMode="cover" />
                  <View className="items-center py-2 px-1">
                    <ThemedText type="small" className="text-foreground font-semibold">{label}</ThemedText>
                  </View>
                  <View className="absolute top-1.5 right-1.5 bg-primary rounded-full w-5 h-5 items-center justify-center">
                    <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' } as const} size={12} tintColor={COLORS.primaryForeground} />
                  </View>
                </HapticPressable>
              );
            }

            return (
              <HapticPressable
                key={i}
                haptic="light"
                onPress={() => setSourceModalIndex(i)}
                className="bg-card border-2 border-dashed border-border rounded-xl items-center justify-center"
                style={{ width: CARD_WIDTH, height: CARD_HEIGHT + 28 }}
              >
                <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' } as const} size={24} tintColor={COLORS.mutedForeground} />
                <ThemedText type="small" className="text-muted-foreground mt-1 text-center">{label}</ThemedText>
              </HapticPressable>
            );
          })}
        </View>

        <ThemedText type="small" className="text-muted-foreground mt-2 text-center">
          {photos.filter(Boolean).length}/3 photos added
        </ThemedText>

        {/* Action buttons */}
        <View className="flex-row gap-3 mt-2">
          <PrimaryButton
            onPress={() => router.push('/capture')}
            disabled={photos.filter(Boolean).length > 0}
            className="flex-1">
            <ThemedText className="font-body font-semibold text-primary-foreground">
              Take all 3
            </ThemedText>
          </PrimaryButton>
          <PrimaryButton
            onPress={pickMultipleFromGallery}
            disabled={photos.filter(Boolean).length >= 3}
            className="flex-1">
            <ThemedText className="font-body font-semibold text-primary-foreground">
              From gallery
            </ThemedText>
          </PrimaryButton>
        </View>

        <PrimaryButton
          onPress={analyze}
          disabled={loading || photos.filter(Boolean).length < 3}
          loading={loading}
          className="mt-3"
        >
          <ThemedText className="font-body font-semibold text-primary-foreground">
            Analyze with Gemini
          </ThemedText>
        </PrimaryButton>

        {result && (
          <View className={card.base}>
            <View className="flex-row items-center gap-2 mb-3">
              <SymbolView name={{ ios: 'face.smiling', android: 'sentiment_satisfied', web: 'mood' } as const} size={24} tintColor={COLORS.primary} />
              <ThemedText type="title" className="text-foreground">
                Your Style Analysis
              </ThemedText>
            </View>

            {result.generated_image_url && (
              <Image
                source={{ uri: result.generated_image_url }}
                style={{ width: '100%', height: 280, borderRadius: 12, marginBottom: 12 }}
                resizeMode="cover"
              />
            )}

            <View className="flex-row gap-2 flex-wrap mb-3">
              <HapticPressable className="rounded-xl border border-border bg-card px-3 py-2.5">
                <ThemedText className="font-body text-foreground">
                  Face: {result.face_shape}
                </ThemedText>
              </HapticPressable>
            </View>
            <ThemedText type="title" className="text-xl text-foreground">
              {result.suggested_haircut}
            </ThemedText>
            {result.styling_reason && (
              <ThemedText type="default" className="text-muted-foreground mt-2">
                {result.styling_reason}
              </ThemedText>
            )}
            <ThemedText type="small" className="text-muted-foreground mt-1 italic">
              {result.analysis_details}
            </ThemedText>
          </View>
        )}

        {/* Past analyses */}
        {!analysesLoading && analyses.length > 0 && (
          <View className="mt-6">
            <ThemedText type="subtitle" className="text-foreground mb-3">
              Past Analyses
            </ThemedText>
            {analyses.map((a) => {
              const isExpanded = expandedId === a.id;
              return (
                <HapticPressable
                  key={a.id}
                  haptic="light"
                  onPress={() => setExpandedId(isExpanded ? null : a.id)}
                  className={`${card.base} mb-3`}
                >
                  {/* Input thumbnails + output image */}
                  <View className="flex-row gap-2 mb-3">
                    {[a.photo_1_url, a.photo_2_url, a.photo_3_url].map((url, i) => (
                      <HapticPressable
                        key={i}
                        haptic="light"
                        onPress={() => setHistoryViewerUri(url)}
                      >
                        <Image
                          source={{ uri: url }}
                          style={{ width: 56, height: 72, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                      </HapticPressable>
                    ))}
                    <View className="flex-1 items-center justify-center">
                      {a.generated_image_url ? (
                        <HapticPressable
                          haptic="light"
                          onPress={() => setHistoryViewerUri(a.generated_image_url!)}
                        >
                          <Image
                            source={{ uri: a.generated_image_url }}
                            style={{ width: 72, height: 72, borderRadius: 8 }}
                            resizeMode="cover"
                          />
                        </HapticPressable>
                      ) : (
                        <View className="w-[72px] h-[72px] rounded-lg bg-muted items-center justify-center">
                          <SymbolView name={{ ios: 'photo', android: 'photo', web: 'photo' } as const} size={20} tintColor={COLORS.mutedForeground} />
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Haircut + date */}
                  <View className="flex-row items-center justify-between">
                    <ThemedText type="default" className="text-foreground font-semibold flex-1" numberOfLines={1}>
                      {a.suggested_haircut}
                    </ThemedText>
                    <ThemedText type="small" className="text-muted-foreground ml-2">
                      {new Date(a.created_at).toLocaleDateString()}
                    </ThemedText>
                  </View>

                  {/* Expanded details */}
                  {isExpanded && (
                    <View className="mt-3 pt-3 border-t border-border">
                      <View className="flex-row gap-2 flex-wrap mb-2">
                        <View className="rounded-lg border border-border bg-card px-2 py-1">
                          <ThemedText type="small" className="text-foreground">Face: {a.face_shape}</ThemedText>
                        </View>
                      </View>
                      {a.styling_reason && (
                        <ThemedText type="small" className="text-muted-foreground mb-1">
                          {a.styling_reason}
                        </ThemedText>
                      )}
                      <ThemedText type="small" className="text-muted-foreground italic">
                        {a.analysis_details}
                      </ThemedText>
                    </View>
                  )}
                </HapticPressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Source picker modal */}
      <Modal visible={sourceModalIndex !== null} transparent animationType="fade" onRequestClose={() => setSourceModalIndex(null)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSourceModalIndex(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View className="bg-card rounded-2xl p-6 w-[80%] max-w-[300px]">
              <ThemedText type="title" className="text-foreground text-center mb-1">
                Add Photo
              </ThemedText>
              <ThemedText type="small" className="text-muted-foreground text-center mb-5">
                {PHOTO_LABELS[sourceModalIndex ?? 0]}
              </ThemedText>
              <View className="gap-3">
                <HapticPressable
                  haptic="medium"
                  onPress={() => openSingleCamera(sourceModalIndex ?? 0)}
                  className="flex-row items-center gap-3 bg-primary/10 rounded-xl px-4 py-3"
                >
                  <SymbolView name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } as const} size={22} tintColor={COLORS.primary} />
                  <ThemedText type="default" className="text-foreground font-semibold">Take with Camera</ThemedText>
                </HapticPressable>
                <HapticPressable
                  haptic="medium"
                  onPress={() => pickFromGallery(sourceModalIndex ?? 0)}
                  className="flex-row items-center gap-3 bg-primary/10 rounded-xl px-4 py-3"
                >
                  <SymbolView name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' } as const} size={22} tintColor={COLORS.primary} />
                  <ThemedText type="default" className="text-foreground font-semibold">Choose from Gallery</ThemedText>
                </HapticPressable>
              </View>
              <HapticPressable
                haptic="light"
                onPress={() => setSourceModalIndex(null)}
                className="mt-4 items-center py-2"
              >
                <ThemedText type="small" className="text-muted-foreground">Cancel</ThemedText>
              </HapticPressable>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit/view modal */}
      <Modal visible={editModalIndex !== null} transparent animationType="fade" onRequestClose={() => setEditModalIndex(null)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setEditModalIndex(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: COLORS.background, borderRadius: 16, padding: 24, width: SCREEN_WIDTH * 0.8, maxWidth: 320 }}>
              <ThemedText type="title" className="text-foreground text-center mb-1">
                {PHOTO_LABELS[editModalIndex ?? 0]}
              </ThemedText>
              <ThemedText type="small" className="text-muted-foreground text-center mb-4">
                Choose an action
              </ThemedText>
              {editModalIndex !== null && photos[editModalIndex] ? (
                <Image
                  source={{ uri: photos[editModalIndex] }}
                  style={{ width: SCREEN_WIDTH * 0.65, height: 160, borderRadius: 12, marginBottom: 16, alignSelf: 'center' }}
                  resizeMode="cover"
                />
              ) : null}
              <View className="gap-3">
                <HapticPressable
                  haptic="medium"
                  onPress={() => { setViewerUri(photos[editModalIndex!]); setEditModalIndex(null); }}
                  className="flex-row items-center gap-3 bg-primary/10 rounded-xl px-4 py-3"
                >
                  <SymbolView name={{ ios: 'arrow.up.left.and.arrow.down.right', android: 'fullscreen', web: 'fullscreen' } as const} size={22} tintColor={COLORS.primary} />
                  <ThemedText type="default" className="text-foreground font-semibold">View Full Size</ThemedText>
                </HapticPressable>
                <HapticPressable
                  haptic="medium"
                  onPress={() => cropPhoto(editModalIndex!)}
                  className="flex-row items-center gap-3 bg-primary/10 rounded-xl px-4 py-3"
                >
                  <SymbolView name={{ ios: 'crop', android: 'crop', web: 'crop' } as const} size={22} tintColor={COLORS.primary} />
                  <ThemedText type="default" className="text-foreground font-semibold">Crop & Adjust</ThemedText>
                </HapticPressable>
                <HapticPressable
                  haptic="medium"
                  onPress={() => removePhoto(editModalIndex!)}
                  className="flex-row items-center gap-3 bg-destructive/10 rounded-xl px-4 py-3"
                >
                  <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' } as const} size={22} tintColor={COLORS.destructive} />
                  <ThemedText type="default" className="text-destructive font-semibold">Remove Photo</ThemedText>
                </HapticPressable>
              </View>
              <HapticPressable
                haptic="light"
                onPress={() => setEditModalIndex(null)}
                className="mt-4 items-center py-2"
              >
                <ThemedText type="small" className="text-muted-foreground">Cancel</ThemedText>
              </HapticPressable>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Pinch-to-zoom viewer */}
      <Modal visible={viewerUri !== null} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          {viewerUri && <PinchZoomImage uri={viewerUri} />}
          <TouchableOpacity
            onPress={() => setViewerUri(null)}
            style={{ position: 'absolute', top: 60, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
          >
            <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' } as const} size={18} tintColor="white" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* History image preview modal */}
      <Modal visible={historyViewerUri !== null} transparent animationType="fade" onRequestClose={() => setHistoryViewerUri(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
          {historyViewerUri && (
            <Image
              source={{ uri: historyViewerUri }}
              style={{ width: SCREEN_WIDTH * 0.85, height: SCREEN_WIDTH * 0.85, borderRadius: 12 }}
              resizeMode="contain"
            />
          )}
          <View style={{ position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => {
                setViewerUri(historyViewerUri);
                setHistoryViewerUri(null);
              }}
              style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <ThemedText type="small" style={{ color: 'white' }}>View Full Screen</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setHistoryViewerUri(null)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
            >
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' } as const} size={18} tintColor="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Analyze progress overlay */}
      {loading && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
          <View style={{ backgroundColor: COLORS.background, borderRadius: 20, padding: 28, width: SCREEN_WIDTH * 0.8, maxWidth: 340, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 16 }} />
            <ThemedText type="title" className="text-foreground text-center mb-4">
              Creating Your Style
            </ThemedText>
            <View style={{ width: '100%', height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              <RNAnimated.View
                style={{
                  height: '100%',
                  backgroundColor: COLORS.primary,
                  borderRadius: 4,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }}
              />
            </View>
            <ThemedText type="small" className="text-muted-foreground text-center">
              {progressText}
            </ThemedText>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// --- Single-slot guided camera ---

function SingleGuidedCamera({
  slotIndex,
  onCapture,
  onCancel,
}: {
  slotIndex: number;
  onCapture: (uri: string) => void;
  onCancel: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const { width } = Dimensions.get('window');
  const ovalW = width * 0.55;
  const ovalH = ovalW * 1.3;

  if (!permission) return <View style={{ flex: 1, backgroundColor: 'black' }} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <SymbolView name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } as const} size={48} tintColor={COLORS.mutedForeground} />
        <ThemedText type="title" className="text-foreground mt-4">Camera access required</ThemedText>
        <PrimaryButton onPress={requestPermission} className="mt-6 mx-8">
          <ThemedText className="font-body font-semibold text-primary-foreground">Grant Permission</ThemedText>
        </PrimaryButton>
        <TouchableOpacity onPress={onCancel} className="mt-4">
          <ThemedText className="text-muted-foreground">Go back</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const takePhoto = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) setPreviewUri(photo.uri);
  };

  const confirmPhoto = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCapture(previewUri!);
  };

  const retakePhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreviewUri(null);
  };

  const toggleFacing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  };

  // Preview
  if (previewUri) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Image source={{ uri: previewUri }} style={{ flex: 1 }} resizeMode="cover" />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
          <View style={{ width: ovalW, height: ovalH, borderRadius: ovalW / 2, borderWidth: 2, borderColor: COLORS.primary, opacity: 0.7 }} />
          <ThemedText type="small" style={{ color: 'white', marginTop: 12, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4 }}>
            Is your face clearly visible?
          </ThemedText>
        </View>
        <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' }}>
          <GlassSurface intensity={60} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
            <ThemedText type="smallBold" style={{ color: 'white' }}>{PHOTO_LABELS[slotIndex]} — Preview</ThemedText>
          </GlassSurface>
        </View>
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
              <ThemedText type="smallBold" style={{ color: 'white' }}>Use photo</ThemedText>
            </TouchableOpacity>
          </GlassSurface>
        </View>
      </View>
    );
  }

  // Camera
  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView ref={cameraRef} mirror style={{ flex: 1 }} facing={facing} />

      {/* Label */}
      <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
        <GlassSurface intensity={60} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
          <ThemedText type="smallBold" style={{ color: 'white' }}>{PHOTO_LABELS[slotIndex]}</ThemedText>
        </GlassSurface>
      </View>

      {/* Face guide oval */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
        <View style={{ width: ovalW, height: ovalH, borderRadius: ovalW / 2, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed' }} />
        <ThemedText type="small" style={{ color: 'white', marginTop: 16, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, textAlign: 'center', paddingHorizontal: 40 }}>
          {slotIndex === 0 && 'Position your face inside the oval, facing the camera'}
          {slotIndex === 1 && 'Turn your head to the left, keep face in the oval'}
          {slotIndex === 2 && 'Turn your head to the right, keep face in the oval'}
        </ThemedText>
      </View>

      {/* Bottom controls */}
      <View style={{ position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center', gap: 16 }}>
        <GlassSurface intensity={60} style={{ borderRadius: 99 }}>
          <TouchableOpacity onPress={takePhoto} style={{ width: 68, height: 68, borderRadius: 99, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: 58, height: 58, borderRadius: 99, borderWidth: 3, borderColor: 'black' }} />
          </TouchableOpacity>
        </GlassSurface>
        <View style={{ flexDirection: 'row', gap: 32, marginTop: 4 }}>
          <GlassSurface intensity={60} style={{ borderRadius: 99 }}>
            <TouchableOpacity onPress={toggleFacing} style={{ padding: 12, borderRadius: 99 }}>
              <SymbolView name={{ ios: 'arrow.triangle.2.circlepath', android: 'flip_camera_android', web: 'sync' } as const} size={24} tintColor="white" />
            </TouchableOpacity>
          </GlassSurface>
          <GlassSurface intensity={60} style={{ borderRadius: 99 }}>
            <TouchableOpacity onPress={onCancel} style={{ padding: 12, borderRadius: 99 }}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' } as const} size={24} tintColor="white" />
            </TouchableOpacity>
          </GlassSurface>
        </View>
      </View>
    </View>
  );
}

// --- Pinch-to-zoom image component ---

function PinchZoomImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 4));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = 1;
        savedScale.value = 1;
        translateX.value = 0;
        translateY.value = 0;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = 2;
        savedScale.value = 2;
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.Image
        source={{ uri }}
        style={[{ width: SCREEN_WIDTH * 0.9, height: SCREEN_WIDTH * 0.9, borderRadius: 12 }, animatedStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
}
