import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { HapticPressable, PrimaryButton } from '@/components/ui';
import { PLACEHOLDER_COLOR } from '@/constants/design-tokens';
import { btn, chip, input, screen } from '@/constants/ui-classes';
import { useAuthSession } from '@/contexts/auth-session';
import { appAlert } from '@/lib/app-alert';
import { formatApiError } from '@/lib/network-error';
import {
  fetchProfile,
  updateProfile,
  PROFILE_CITIES,
  type AppProfile,
  type ProfileCity,
} from '@/lib/profile';
import {
  formatPakistanPhoneDisplay,
  sanitizePakistanPhoneInput,
  toPakistanE164,
} from '@/lib/pakistan-phone';

export default function ProfileScreen() {
  const { user, signOut } = useAuthSession();
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phoneNational, setPhoneNational] = useState('');
  const [city, setCity] = useState<ProfileCity>('Lahore');
  const [avatarUrl, setAvatarUrl] = useState('');

  const applyProfile = (p: AppProfile) => {
    setProfile(p);
    setName(p.name ?? '');
    const raw = p.phone ?? '';
    setPhoneNational(
      raw.startsWith('+92') ? sanitizePakistanPhoneInput(raw.slice(3)) : sanitizePakistanPhoneInput(raw)
    );
    setCity(p.city);
    setAvatarUrl(p.avatar_url ?? '');
  };

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (user?.role === 'admin') {
      setProfile(null);
      setLoading(false);
      return;
    }
    if (!opts?.silent) setLoading(true);
    try {
      applyProfile(await fetchProfile());
    } catch (err: unknown) {
      appAlert('Error', formatApiError(err, 'Could not load profile'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load({ silent: true });
  }, [load]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      appAlert('Name required', 'Enter your display name.');
      return;
    }
    const phoneE164 = phoneNational.trim() ? toPakistanE164(phoneNational) : null;
    if (phoneNational.trim() && !phoneE164) {
      appAlert('Invalid phone', 'Enter a valid Pakistan mobile number (3XX…).');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: trimmedName,
        phone: phoneE164 ?? undefined,
        city,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      applyProfile(updated);
      appAlert('Saved', 'Your profile has been updated.');
    } catch (err: unknown) {
      appAlert('Error', formatApiError(err, 'Could not save profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <SafeAreaView className={screen.center}>
        <ActivityIndicator size="large" color={PLACEHOLDER_COLOR} />
      </SafeAreaView>
    );
  }

  if (user?.role === 'admin') {
    return (
      <SafeAreaView className={screen.padded}>
        <ThemedText type="subtitle">Admin account</ThemedText>
        <ThemedText themeColor="textSecondary" className="mt-3">
          Use the BookMyBarber web dashboard for admin tasks.
        </ThemedText>
        <HapticPressable className={`${btn.secondary} mt-6`} onPress={() => signOut()}>
          <ThemedText className={btn.secondaryText}>Sign out</ThemedText>
        </HapticPressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={screen.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName={screen.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <ThemedText type="subtitle">Profile</ThemedText>
        <ThemedText themeColor="textSecondary">
          Manage your account details. Email cannot be changed here.
        </ThemedText>

        <View className={chip.base}>
          <ThemedText className="font-body text-xs text-muted-foreground">Email</ThemedText>
          <ThemedText selectable className="mt-1 font-body font-semibold text-foreground">
            {profile?.email ?? user?.email ?? '—'}
          </ThemedText>
        </View>

        <View className={chip.base}>
          <ThemedText className="font-body text-xs text-muted-foreground">Role</ThemedText>
          <ThemedText selectable className="mt-1 font-body font-semibold capitalize text-primary">
            {profile?.role ?? user?.role ?? '—'}
          </ThemedText>
        </View>

        <ThemedText className="font-body text-sm font-semibold text-foreground">Display name</ThemedText>
        <TextInput
          className={input.base}
          placeholder="Your name"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={name}
          onChangeText={setName}
        />

        <ThemedText className="font-body text-sm font-semibold text-foreground">Phone (PK)</ThemedText>
        <TextInput
          className={input.base}
          placeholder="300 1234567"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={formatPakistanPhoneDisplay(phoneNational)}
          onChangeText={(t) => setPhoneNational(sanitizePakistanPhoneInput(t))}
          keyboardType="phone-pad"
        />

        <ThemedText className="font-body text-sm font-semibold text-foreground">City</ThemedText>
        <View className="flex-row gap-2">
          {PROFILE_CITIES.map((c) => (
            <HapticPressable
              key={c}
              className={`${chip.base} flex-1 ${city === c ? chip.active : ''}`}
              onPress={() => setCity(c)}>
              <ThemedText className={`${chip.text} text-center text-xs`}>{c}</ThemedText>
            </HapticPressable>
          ))}
        </View>

        <ThemedText className="font-body text-sm font-semibold text-foreground">
          Avatar URL (optional)
        </ThemedText>
        <TextInput
          className={input.base}
          placeholder="https://…"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        <PrimaryButton loading={saving} onPress={handleSave}>
          <ThemedText className="font-body font-semibold text-primary-foreground">Save changes</ThemedText>
        </PrimaryButton>

        <HapticPressable
          className="mt-2 rounded-xl border border-destructive/40 px-4 py-3 items-center"
          onPress={() => signOut()}>
          <ThemedText className="font-body font-semibold text-destructive">Sign out</ThemedText>
        </HapticPressable>
      </ScrollView>
    </SafeAreaView>
  );
}
