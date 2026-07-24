import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';

import { HapticPressable } from '@/components/ui';
import { btn, input } from '@/constants/ui-classes';
import { COLORS } from '@/constants/design-tokens';
import { PasswordStrengthBar } from '@/components/password-strength-bar';
import { ThemedText } from '@/components/themed-text';
import { useAndroidAutofillRemountKey } from '@/hooks/use-android-autofill-remount-key';
import { authConfirmPasswordProps, authNewPasswordProps } from '@/lib/auth-autofill';
import { resetPassword } from '@/lib/password-reset';
import { formatAuthError } from '@/lib/auth-errors';
import { appAlert } from '@/lib/app-alert';

export default function ResetPasswordPage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const autofillKey = useAndroidAutofillRemountKey();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const confirmRef = useRef<TextInput>(null);

  const clearError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleReset = async () => {
    if (!validate()) return;
    if (!token) {
      appAlert('Error', 'Invalid reset session. Please start again.');
      router.replace('/(auth)/forgot-password' as any);
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(token, password);
      appAlert('Success', 'Your password has been reset successfully.', undefined, {
        variant: 'success',
      });
      router.replace('/(auth)/login' as any);
    } catch (error) {
      setErrors({ password: formatAuthError(error) });
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
            Set New Password
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" className="mt-1 text-center">
            Choose a strong password for your account.
          </ThemedText>
        </View>

        <View className="gap-4">
          <View key={`password-${autofillKey}`} className="relative">
            <TextInput
              className={`${errors.password ? input.error : input.base} pr-12`}
              placeholder="New Password"
              placeholderTextColor={COLORS.mutedForeground}
              secureTextEntry={!showPassword}
              {...authNewPasswordProps}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => confirmRef.current?.focus()}
              value={password}
              onChangeText={(t) => { setPassword(t); clearError('password'); }}
            />
            <Pressable
              className="absolute right-3 top-0 bottom-0 justify-center"
              onPress={() => setShowPassword((p) => !p)}
              hitSlop={8}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? (
                <EyeOff size={20} color={COLORS.mutedForeground} />
              ) : (
                <Eye size={20} color={COLORS.mutedForeground} />
              )}
            </Pressable>
            <PasswordStrengthBar password={password} />
            {errors.password ? (
              <Text className="mt-1 font-body text-sm text-destructive">{errors.password}</Text>
            ) : null}
          </View>

          <View key={`confirm-${autofillKey}`} className="relative">
            <TextInput
              ref={confirmRef}
              className={`${errors.confirm ? input.error : input.base} pr-12`}
              placeholder="Confirm New Password"
              placeholderTextColor={COLORS.mutedForeground}
              secureTextEntry={!showConfirm}
              {...authConfirmPasswordProps}
              returnKeyType="go"
              onSubmitEditing={handleReset}
              value={confirm}
              onChangeText={(t) => { setConfirm(t); clearError('confirm'); }}
            />
            <Pressable
              className="absolute right-3 top-0 bottom-0 justify-center"
              onPress={() => setShowConfirm((p) => !p)}
              hitSlop={8}
              accessibilityLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>
              {showConfirm ? (
                <EyeOff size={20} color={COLORS.mutedForeground} />
              ) : (
                <Eye size={20} color={COLORS.mutedForeground} />
              )}
            </Pressable>
            {errors.confirm ? (
              <Text className="mt-1 font-body text-sm text-destructive">{errors.confirm}</Text>
            ) : null}
          </View>

          <HapticPressable haptic="medium" className={btn.primary} onPress={handleReset} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.primaryForeground} />
            ) : (
              <ThemedText className={btn.primaryText}>Reset Password</ThemedText>
            )}
          </HapticPressable>
        </View>
      </ScrollView>
    </View>
  );
}
