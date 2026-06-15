import React, { useState } from 'react';
import { View, Image, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui';
import { btn, card, screen } from '@/constants/ui-classes';
import { appAlert } from '@/lib/app-alert';
import { api } from '@/lib/api';

export default function StyleGuideScreen() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
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
      setPhotos((p) => [...p, res.assets[0].uri].slice(0, 3));
    }
  };

  const analyze = async () => {
    if (photos.length < 3) {
      appAlert('Add 3 portrait photos');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      photos.forEach((uri, i) => {
        form.append('photos', {
          uri,
          name: `photo${i}.jpg`,
          type: 'image/jpeg',
        } as unknown as Blob);
      });
      form.append('customerPrompt', 'Suggest a modern haircut for my face shape');

      const { data } = await api.post('/app/ai/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.analysis);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      appAlert('Analysis failed', message ?? 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className={screen.root}>
      <ScrollView contentContainerClassName="gap-4 p-5">
        <ThemedText type="subtitle">AI Style Guide</ThemedText>
        <ThemedText themeColor="textSecondary">Upload 3 portraits (front, side, back)</ThemedText>

        <View className="flex-row gap-2">
          {photos.map((uri, i) => (
            <Image key={i} source={{ uri }} className="h-20 w-20 rounded-lg" />
          ))}
        </View>

        <HapticPressable className={btn.primary} onPress={pickPhoto}>
          <ThemedText className={btn.primaryText}>Add photo ({photos.length}/3)</ThemedText>
        </HapticPressable>

        <HapticPressable className={btn.primary} onPress={analyze} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText className={`${btn.primaryText} font-bold`}>Analyze with Gemini</ThemedText>
          )}
        </HapticPressable>

        {result && (
          <View className={card.base}>
            <ThemedText className="text-primary">Face: {result.face_shape}</ThemedText>
            <ThemedText className="mt-2 font-body font-bold">{result.suggested_haircut}</ThemedText>
            <ThemedText themeColor="textSecondary" className="mt-2">
              {result.analysis_details}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
