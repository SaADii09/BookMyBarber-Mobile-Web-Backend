import React, { useState, useEffect } from 'react';
import { View, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui';
import { btn, chip, input, screen } from '@/constants/ui-classes';
import { PLACEHOLDER_COLOR, COLORS } from '@/constants/design-tokens';
import { appAlert } from '@/lib/app-alert';
import { api } from '@/lib/api';
import { useAuthSession } from '@/contexts/auth-session';

export default function SupportScreen() {
  const { status } = useAuthSession();

  const [targetType, setTargetType] = useState<'shop' | 'app'>('app');
  const [targetId, setTargetId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    console.log('[Support] Screen mounted, status:', status);
    if (status === 'guest') {
      router.replace('/(auth)/login' as any);
    }
  }, [status]);

  if (status === 'loading' || status === 'guest') {
    return (
      <SafeAreaView className={screen.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const submit = async () => {
    if (!subject.trim() || !description.trim()) {
      appAlert('Subject and description are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/app/feedbacks', {
        targetType,
        targetId: targetType === 'shop' ? targetId : undefined,
        subject: subject.trim(),
        description: description.trim(),
      });
      appAlert('Submitted', 'Thank you — our team will review your feedback.');
      setSubject('');
      setDescription('');
      setTargetId('');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      appAlert('Failed', message ?? 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className={screen.root}>
      <Stack.Screen options={{ title: 'Feedback & Support', headerShown: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName={screen.scrollContent}>
        <ThemedText type="subtitle">Feedback & Support</ThemedText>
        <ThemedText themeColor="textSecondary">
          Report an issue with the app or a specific barber shop.
        </ThemedText>

        <View className="flex-row gap-2">
          {(['app', 'shop'] as const).map((t) => (
            <HapticPressable
              key={t}
              className={`${chip.base} ${targetType === t ? chip.active : ''}`}
              onPress={() => setTargetType(t)}>
              <ThemedText className={chip.text}>{t === 'app' ? 'App' : 'Shop'}</ThemedText>
            </HapticPressable>
          ))}
        </View>

        {targetType === 'shop' && (
          <TextInput
            className={input.base}
            placeholder="Shop ID (from shop detail)"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={targetId}
            onChangeText={setTargetId}
          />
        )}

        <TextInput
          className={input.base}
          placeholder="Subject"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={subject}
          onChangeText={setSubject}
        />
        <TextInput
          className={input.multiline}
          placeholder="Describe your feedback or complaint"
          placeholderTextColor={PLACEHOLDER_COLOR}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <HapticPressable
          haptic="medium"
          className={btn.primary}
          onPress={submit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={COLORS.primaryForeground} />
          ) : (
            <ThemedText className={btn.primaryText}>Submit feedback</ThemedText>
          )}
        </HapticPressable>
      </ScrollView>
    </SafeAreaView>
  );
}