import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { AppText } from '@/components/ui/app-text';
import { useBarberStudio } from '@/contexts/barber-studio';
import { useSystemBars } from '@/hooks/use-system-bars';
import { COLORS } from '@/constants/design-tokens';
import { input, screen } from '@/constants/ui-classes';
import { appAlert } from '@/lib/app-alert';
import type { BarberShopRow } from '@/lib/booking-types';
import { fetchMyShops, updateShopDetails } from '@/lib/shops';
import { formatApiError } from '@/lib/network-error';

export default function DetailsPage() {
  const scheme = useColorScheme();
  const { selectedShopId } = useBarberStudio();

  const [shop, setShop] = useState<BarberShopRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  useSystemBars({
    statusBarStyle: scheme === 'dark' ? 'light' : 'dark',
    navigationBarStyle: scheme === 'dark' ? 'light' : 'dark',
  });

  const loadShop = useCallback(
    async (showLoading = true) => {
      if (!selectedShopId) return;
      if (showLoading) setLoading(true);
      try {
        const shops = await fetchMyShops();
        const found = shops.find((s) => s.id === selectedShopId) ?? null;
        setShop(found);
        if (found) {
          setName(found.name);
          setDescription(found.description ?? '');
          setBusinessPhone(found.business_phone ?? '');
          setWebsiteUrl(found.website_url ?? '');
        }
      } catch (err) {
        appAlert('Load failed', formatApiError(err, 'Could not load shop details'), undefined, {
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    },
    [selectedShopId],
  );

  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  const handleSave = async () => {
    if (!selectedShopId || !name.trim()) {
      appAlert('Validation', 'Shop name is required.', undefined, { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const { shop: updated } = await updateShopDetails(selectedShopId, {
        name: name.trim(),
        description: description.trim() || null,
        businessPhone: businessPhone.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
      });
      setShop(updated);
      appAlert('Saved', 'Shop details updated.', undefined, { variant: 'success' });
    } catch (err) {
      appAlert('Save failed', formatApiError(err, 'Could not update shop details'), undefined, {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className={screen.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!shop) {
    return (
      <View className={screen.center}>
        <ThemedText className="text-muted-foreground">Shop not found</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pt-4 pb-8 gap-5"
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => loadShop(false)} colors={[COLORS.primary]} />
      }
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant="heading" className="text-xl">Shop Details</AppText>

      <View className="gap-1">
        <AppText variant="label">Shop Name</AppText>
        <TextInput
          className={input.base}
          value={name}
          onChangeText={setName}
          placeholder="Barber shop name"
          placeholderTextColor={COLORS.mutedForeground}
          autoCapitalize="words"
        />
      </View>

      <View className="gap-1">
        <AppText variant="label">Description</AppText>
        <TextInput
          className={input.multiline}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your shop…"
          placeholderTextColor={COLORS.mutedForeground}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View className="gap-1">
        <AppText variant="label">Business Phone</AppText>
        <TextInput
          className={input.base}
          value={businessPhone}
          onChangeText={setBusinessPhone}
          placeholder="+92 3XX XXXXXXX"
          placeholderTextColor={COLORS.mutedForeground}
          keyboardType="phone-pad"
        />
      </View>

      <View className="gap-1">
        <AppText variant="label">Website URL</AppText>
        <TextInput
          className={input.base}
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          placeholder="https://example.com"
          placeholderTextColor={COLORS.mutedForeground}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <PrimaryButton loading={saving} onPress={handleSave} className="mt-2">
        <ThemedText className="font-body font-semibold text-primary-foreground">
          Save Changes
        </ThemedText>
      </PrimaryButton>
    </ScrollView>
  );
}
