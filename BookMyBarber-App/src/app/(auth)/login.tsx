import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import axios from 'axios';

import { HapticPressable } from '@/components/ui';
import { SocialSignInButtons } from '@/components/social-sign-in-buttons';
import { btn, input } from '@/constants/ui-classes';
import { COLORS } from '@/constants/design-tokens';
import { ThemedText } from '@/components/themed-text';
import { useAndroidAutofillRemountKey } from '@/hooks/use-android-autofill-remount-key';
import { authCurrentPasswordProps, authEmailProps } from '@/lib/auth-autofill';
import { login } from '@/lib/auth';
import { formatAuthError } from '@/lib/auth-errors';
import { useAuthSession } from '@/contexts/auth-session';

export default function LoginPage() {
  const { onLoginSuccess } = useAuthSession();
  const autofillKey = useAndroidAutofillRemountKey();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const passwordRef = useRef<TextInput>(null);

  const validate = () => {
    const e: { email?: string; password?: string } = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Invalid email format';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      await onLoginSuccess();
      router.replace('/(tabs)' as any);
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (error.response?.data as { code?: string } | undefined)?.code === 'EMAIL_NOT_VERIFIED'
      ) {
        const lockedUntil = (error.response?.data as { lockedUntil?: string } | undefined)?.lockedUntil;
        if (lockedUntil) {
          router.replace(
            `/(auth)/account-locked?lockedUntil=${encodeURIComponent(lockedUntil)}&reason=verify` as any
          );
          return;
        }
        router.push(
          `/(auth)/verify-email?email=${encodeURIComponent(email.trim())}&autoResend=true` as any
        );
        return;
      }
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
            BookMyBarber
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" className="mt-1 text-center">
            Find & book the best barbers in Pakistan
          </ThemedText>
        </View>

        <View className="gap-4">
          <View key={`email-${autofillKey}`}>
            <TextInput
              className={errors.email ? input.error : input.base}
              placeholder="Email Address"
              placeholderTextColor={COLORS.mutedForeground}
              {...authEmailProps}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors((prev) => { const n = { ...prev }; delete n.email; return n; }); }}
            />
            {errors.email ? (
              <Text className="mt-1 font-body text-sm text-destructive">{errors.email}</Text>
            ) : null}
          </View>

          <View key={`password-${autofillKey}`} className="relative">
            <TextInput
              ref={passwordRef}
              className={`${errors.password ? input.error : input.base} pr-12`}
              placeholder="Password"
              placeholderTextColor={COLORS.mutedForeground}
              secureTextEntry={!showPassword}
              {...authCurrentPasswordProps}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors((prev) => { const n = { ...prev }; delete n.password; return n; }); }}
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
            {errors.password ? (
              <Text className="mt-1 font-body text-sm text-destructive">{errors.password}</Text>
            ) : null}
          </View>

          <HapticPressable onPress={() => router.push('/(auth)/forgot-password' as any)}>
            <Text className="text-right font-body text-sm font-medium text-primary">
              Forgot Password?
            </Text>
          </HapticPressable>

          <HapticPressable haptic="medium" className={btn.primary} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.primaryForeground} />
            ) : (
              <ThemedText className={btn.primaryText}>Sign In</ThemedText>
            )}
          </HapticPressable>

          <SocialSignInButtons />
        </View>

        <View className="mt-8 flex-row justify-center gap-1">
          <ThemedText type="small" themeColor="textSecondary">
            Don&apos;t have an account?
          </ThemedText>
          <Link href={'/(auth)/signup' as any} asChild>
            <HapticPressable>
              <ThemedText type="small" themeColor="primary" className="font-semibold">
                Sign Up
              </ThemedText>
            </HapticPressable>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}
