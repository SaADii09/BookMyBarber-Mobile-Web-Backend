import { useState, useRef } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { HapticPressable } from '@/components/ui';
import { btn, input } from '@/constants/ui-classes';
import { COLORS } from '@/constants/design-tokens';
import { ThemedText } from '@/components/themed-text';
import { useAndroidAutofillRemountKey } from '@/hooks/use-android-autofill-remount-key';
import { authOtpProps } from '@/lib/auth-autofill';
import { verifyResetCode } from '@/lib/password-reset';
import { formatAuthError } from '@/lib/auth-errors';

const CODE_LENGTH = 6;

export default function VerifyResetCodePage() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const autofillKey = useAndroidAutofillRemountKey();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

  const handleVerify = async () => {
    if (normalized.length !== CODE_LENGTH) {
      setError(`Please enter the ${CODE_LENGTH}-character code`);
      return;
    }
    if (!email) {
      setError('Session expired. Please start again.');
      return;
    }
    setIsLoading(true);
    try {
      const { resetToken } = await verifyResetCode(email, normalized);
      router.push(`/(auth)/reset-password?token=${encodeURIComponent(resetToken)}` as any);
    } catch (err) {
      setError(formatAuthError(err, 'Invalid or expired code. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled">
        <View className="mb-8 items-center">
          <ThemedText type="title" themeColor="primary" className="text-center">
            Enter Reset Code
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
          </View>

          <HapticPressable haptic="medium" className={btn.primary} onPress={handleVerify} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.primaryForeground} />
            ) : (
              <ThemedText className={btn.primaryText}>Verify Code</ThemedText>
            )}
          </HapticPressable>
        </View>

        <View className="mt-8 items-center">
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
