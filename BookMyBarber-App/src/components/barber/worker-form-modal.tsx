import { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Keyboard,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { HapticPressable } from '@/components/ui/haptic-pressable';
import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { COLORS } from '@/constants/design-tokens';
import { input } from '@/constants/ui-classes';
import { MotiFadeIn } from '@/components/ui/moti-fade-in';
import { appAlert } from '@/lib/app-alert';
import type { WorkerFormData } from '@/lib/workers';

export type { WorkerFormData };

interface WorkerFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: WorkerFormData) => Promise<void>;
  initialData?: WorkerFormData | null;
  loading?: boolean;
  onDelete?: () => Promise<void>;
}

export function WorkerFormModal({
  visible,
  onClose,
  onSave,
  initialData,
  loading = false,
  onDelete,
}: WorkerFormModalProps) {
  const isEdit = !!initialData;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? '');
      setPhone(initialData?.phone ?? '');
      setSpecialties(initialData?.specialties ?? '');
      setAvatarUrl(initialData?.avatarUrl ?? '');
      setNameError('');
    }
  }, [visible, initialData]);

  const validate = (): boolean => {
    if (name.trim().length < 1) {
      setNameError('Name is required');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    Keyboard.dismiss();
    await onSave({
      name: name.trim(),
      phone: phone.trim() || undefined,
      specialties,
      avatarUrl: avatarUrl.trim() || undefined,
    });
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    appAlert(
      'Remove Worker',
      'This will deactivate the worker. They will no longer appear in bookings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void onDelete() },
      ],
      { variant: 'warning' }
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="justify-end"
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <MotiFadeIn>
              <View className="bg-background rounded-t-3xl max-h-[85vh]">
                <View className="px-5 pt-5 pb-3 border-b border-border">
                  <View className="flex-row items-center justify-between">
                    <AppText variant="heading" className="text-xl">
                      {isEdit ? 'Edit Worker' : 'New Worker'}
                    </AppText>
                    <HapticPressable
                      onPress={onClose}
                      className="w-8 h-8 rounded-full bg-secondary items-center justify-center"
                    >
                      <ThemedText className="text-foreground text-sm">✕</ThemedText>
                    </HapticPressable>
                  </View>
                </View>

                <ScrollView
                  className="px-5 pt-4"
                  contentContainerStyle={{ paddingBottom: 32, gap: 20 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View className="gap-1.5">
                    <AppText variant="label">WORKER NAME</AppText>
                    <TextInput
                      className={`${input.base} ${nameError ? 'border-destructive' : ''}`}
                      placeholder="e.g. Ali"
                      placeholderTextColor={COLORS.mutedForeground}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      autoFocus
                    />
                    {nameError && (
                      <AppText variant="caption" className="text-destructive">{nameError}</AppText>
                    )}
                  </View>

                  <View className="gap-1.5">
                    <AppText variant="label">PHONE (OPTIONAL)</AppText>
                    <TextInput
                      className={input.base}
                      placeholder="e.g. 0300 1234567"
                      placeholderTextColor={COLORS.mutedForeground}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View className="gap-1.5">
                    <AppText variant="label">SPECIALTIES (OPTIONAL)</AppText>
                    <TextInput
                      className={input.base}
                      placeholder="e.g. Beard, Fade, Haircut"
                      placeholderTextColor={COLORS.mutedForeground}
                      value={specialties}
                      onChangeText={setSpecialties}
                    />
                    <AppText variant="caption" className="text-muted-foreground">
                      Comma separated
                    </AppText>
                  </View>

                  <View className="gap-1.5">
                    <AppText variant="label">AVATAR URL (OPTIONAL)</AppText>
                    <TextInput
                      className={input.base}
                      placeholder="https://..."
                      placeholderTextColor={COLORS.mutedForeground}
                      value={avatarUrl}
                      onChangeText={setAvatarUrl}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>

                  <View className="flex-row gap-3 pt-2">
                    <HapticPressable
                      className="flex-1 rounded-xl border border-border bg-secondary items-center justify-center py-3.5 active:opacity-80"
                      onPress={onClose}
                    >
                      <ThemedText className="font-body font-semibold text-foreground">Cancel</ThemedText>
                    </HapticPressable>
                    <PrimaryButton loading={loading} onPress={handleSubmit} className="flex-1" style={{ paddingVertical: 14 }}>
                      <ThemedText className="font-body font-semibold text-primary-foreground text-center">
                        {isEdit ? 'Save Changes' : 'Add Worker'}
                      </ThemedText>
                    </PrimaryButton>
                  </View>

                  {isEdit && onDelete && (
                    <HapticPressable
                      className="border border-destructive rounded-xl items-center justify-center py-3.5 active:opacity-80"
                      onPress={handleDelete}
                    >
                      <ThemedText className="font-body font-semibold text-destructive">
                        Remove Worker
                      </ThemedText>
                    </HapticPressable>
                  )}
                </ScrollView>
              </View>
            </MotiFadeIn>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
