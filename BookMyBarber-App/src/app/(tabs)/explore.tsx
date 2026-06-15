import React, { useState } from 'react';
import { View, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui';
import { btn, chip, input, screen } from '@/constants/ui-classes';
import { appAlert } from '@/lib/app-alert';
import { api } from '@/lib/api';

export default function SupportScreen() {
  const [targetType, setTargetType] = useState<'shop' | 'app'>('app');
  const [targetId, setTargetId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      <ScrollView contentContainerClassName="gap-4 p-5">
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
            placeholderTextColor="#676F7E"
            value={targetId}
            onChangeText={setTargetId}
          />
        )}

        <TextInput
          className={input.base}
          placeholder="Subject"
          placeholderTextColor="#676F7E"
          value={subject}
          onChangeText={setSubject}
        />
        <TextInput
          className={input.multiline}
          placeholder="Describe your feedback or complaint"
          placeholderTextColor="#676F7E"
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
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText className={btn.primaryText}>Submit feedback</ThemedText>
          )}
        </HapticPressable>
      </ScrollView>
    </SafeAreaView>
  );
}
