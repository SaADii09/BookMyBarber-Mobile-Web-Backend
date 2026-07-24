import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';

import { HapticPressable } from '@/components/ui';
import { btn, input } from '@/constants/ui-classes';
import { COLORS } from '@/constants/design-tokens';
import { ThemedText } from '@/components/themed-text';
import { useAndroidAutofillRemountKey } from '@/hooks/use-android-autofill-remount-key';
import { authOtpProps } from '@/lib/auth-autofill';
import { resendVerification, verifyEmail } from '@/lib/auth';
import { formatAuthError } from '@/lib/auth-errors';
import { useAuthSession } from '@/contexts/auth-session';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

function getLockedUntil(err: unknown): string | null {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { lockedUntil?: string } | undefined;
    if (data?.lockedUntil) return data.lockedUntil;
  }
  return null;
}

function getLockReason(err: unknown): string | null {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { code?: string } | undefined;
    if (data?.code === 'ACCOUNT_LOCKED') {
      const msg = (err.response?.data as { error?: string } | undefined)?.error ?? '';
      return msg.includes('verification requests') ? 'send' : 'verify';
    }
  }
  return null;
}

export default function VerifyEmailPage() {
  const { email, autoResend } = useLocalSearchParams<{ email: string; autoResend?: string }>();
  const { onLoginSuccess } = useAuthSession();
  const autofillKey = useAndroidAutofillRemountKey();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const didAutoResend = useRef(false);

  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleVerify = async () => {
    if (normalized.length !== CODE_LENGTH) {
      setError(`Please enter the ${CODE_LENGTH}-character code`);
      return;
    }
    if (!email) {
      setError('Session expired. Please sign up again.');
      return;
    }
    setIsLoading(true);
    setInfo('');
    try {
      await verifyEmail(email, normalized);
      await onLoginSuccess();
      router.replace('/(tabs)' as any);
    } catch (err) {
      const lockedUntil = getLockedUntil(err);
      if (lockedUntil) {
        const reason = getLockReason(err) || 'verify';
        router.replace(`/(auth)/account-locked?lockedUntil=${encodeURIComponent(lockedUntil)}&reason=${reason}` as any);
        return;
      }
      setError(formatAuthError(err, 'Invalid or expired code. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0 || isResending) return;
    setIsResending(true);
    setError('');
    setInfo('');
    try {
      await resendVerification(email);
      setInfo('A new code was sent to your email.');
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      const lockedUntil = getLockedUntil(err);
      if (lockedUntil) {
        const reason = getLockReason(err) || 'send';
        router.replace(`/(auth)/account-locked?lockedUntil=${encodeURIComponent(lockedUntil)}&reason=${reason}` as any);
        return;
      }
      setError(formatAuthError(err, 'Unable to resend code. Please try again.'));
    } finally {
      setIsResending(false);
    }
  }, [email, cooldown, isResending]);

  // Auto-resend on mount when navigated from login/signup with autoResend=true
  useEffect(() => {
    if (autoResend === 'true' && email && !didAutoResend.current) {
      didAutoResend.current = true;
      const t = setTimeout(() => handleResend(), 300);
      return () => clearTimeout(t);
    }
  }, [autoResend, email, handleResend]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled">
        <View className="mb-8 items-center">
          <ThemedText type="title" themeColor="primary" className="text-center">
            Verify Your Email
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" className="mt-1 text-center">
            We sent a {CODE_LENGTH}-character code to{' '}
            {email ? (
              <Text className="font-semibold text-foreground">{email}</Text>
            ) : (
              'your email'
            )}
          </ThemedText>
        </View>

        <View className="gap-4">
          <View key={`otp-${autofillKey}`} className="items-center">
            <TextInput
              ref={inputRef}
              className={`w-56 text-center text-2xl tracking-[8px] ${error ? input.error : input.base}`}
              placeholder="—— —— ——"
              placeholderTextColor={COLORS.mutedForeground}
              autoCapitalize="characters"
              keyboardType="ascii-capable"
              {...authOtpProps}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              maxLength={CODE_LENGTH}
              value={normalized}
              onChangeText={(t) => {
                setCode(t);
                setError('');
                if (t.replace(/[^A-Za-z0-9]/g, '').length >= CODE_LENGTH) {
                  inputRef.current?.blur();
                }
              }}
            />
            {error ? (
              <Text className="mt-2 font-body text-sm text-destructive">{error}</Text>
            ) : null}
            {info ? (
              <Text className="mt-2 font-body text-sm text-muted-foreground">{info}</Text>
            ) : null}
          </View>

          <HapticPressable haptic="medium" className={btn.primary} onPress={handleVerify} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.primaryForeground} />
            ) : (
              <ThemedText className={btn.primaryText}>Verify Email</ThemedText>
            )}
          </HapticPressable>
        </View>

        <View className="mt-8 items-center gap-3">
          <HapticPressable onPress={handleResend} disabled={cooldown > 0 || isResending || !email}>
            <ThemedText
              themeColor="primary"
              type="small"
              className={`font-semibold ${cooldown > 0 || !email ? 'opacity-50' : ''}`}>
              {isResending
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend code (${cooldown}s)`
                  : 'Resend code'}
            </ThemedText>
          </HapticPressable>
          <HapticPressable onPress={() => router.back()}>
            <ThemedText themeColor="primary" type="small" className="font-semibold">
              Back
            </ThemedText>
          </HapticPressable>
        </View>
      </ScrollView>
    </View>
  );
}
