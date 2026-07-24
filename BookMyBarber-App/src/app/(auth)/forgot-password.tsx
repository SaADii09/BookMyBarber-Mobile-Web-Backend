import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { HapticPressable } from '@/components/ui';
import { btn, input } from '@/constants/ui-classes';
import { COLORS } from '@/constants/design-tokens';
import { ThemedText } from '@/components/themed-text';
import { useAndroidAutofillRemountKey } from '@/hooks/use-android-autofill-remount-key';
import { authEmailLookupProps } from '@/lib/auth-autofill';
import { forgotPassword } from '@/lib/password-reset';
import { formatAuthError } from '@/lib/auth-errors';

export default function ForgotPasswordPage() {
  const autofillKey = useAndroidAutofillRemountKey();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});

  const validate = () => {
    if (!email.trim()) {
      setErrors({ email: 'Email is required' });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors({ email: 'Invalid email format' });
      return false;
    }
    return true;
  };

  const handleSendCode = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await forgotPassword(email.trim());
      router.push(`/(auth)/verify-reset-code?email=${encodeURIComponent(email.trim())}` as any);
    } catch (error) {
      setErrors({ email: formatAuthError(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled">
          <View className="mb-8 items-center">
            <ThemedText type="title" themeColor="primary" className="text-center">
              Reset Password
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" className="mt-1 text-center">
              Enter your email and we&apos;ll send you a reset code.
            </ThemedText>
          </View>

          <View className="gap-4">
            <View key={`email-${autofillKey}`}>
              <TextInput
                className={errors.email ? input.error : input.base}
                placeholder="Email Address"
                placeholderTextColor={COLORS.mutedForeground}
                {...authEmailLookupProps}
                returnKeyType="send"
                onSubmitEditing={handleSendCode}
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors({}); }}
              />
              {errors.email ? (
                <Text className="mt-1 font-body text-sm text-destructive">{errors.email}</Text>
              ) : null}
            </View>

            <HapticPressable haptic="medium" className={btn.primary} onPress={handleSendCode} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color={COLORS.primaryForeground} />
              ) : (
                <ThemedText className={btn.primaryText}>Send Reset Code</ThemedText>
              )}
            </HapticPressable>
          </View>

          <View className="mt-8 items-center">
            <HapticPressable onPress={() => router.back()}>
              <ThemedText themeColor="primary" type="small" className="font-semibold">
                Back to Sign In
              </ThemedText>
            </HapticPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
