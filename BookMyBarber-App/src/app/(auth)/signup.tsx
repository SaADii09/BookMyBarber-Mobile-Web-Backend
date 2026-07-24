import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';

import { Dropdown, HapticPressable } from '@/components/ui';
import { SocialSignInButtons } from '@/components/social-sign-in-buttons';
import { btn, input } from '@/constants/ui-classes';
import { COLORS } from '@/constants/design-tokens';
import { PasswordStrengthBar } from '@/components/password-strength-bar';
import { ThemedText } from '@/components/themed-text';
import { useAndroidAutofillRemountKey } from '@/hooks/use-android-autofill-remount-key';
import {
  authEmailProps,
  authNameProps,
  authNewPasswordProps,
} from '@/lib/auth-autofill';
import { register, type ProfileCity, type UserRole } from '@/lib/auth';
import { formatAuthError } from '@/lib/auth-errors';
import { appAlert } from '@/lib/app-alert';

const CITIES = [
  { label: 'Gujranwala', value: 'Gujranwala' },
  { label: 'Lahore', value: 'Lahore' },
  { label: 'Vehari', value: 'Vehari' },
];

export default function SignupPage() {
  const autofillKey = useAndroidAutofillRemountKey();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [city, setCity] = useState<ProfileCity>('Lahore');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const clearError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Invalid email format';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const result = await register(email.trim(), password, role, {
        name: name.trim(),
        city,
      });
      if (result.isExisting) {
        appAlert(
          'Account Found',
          'An account with this email already exists but is not verified. A new verification code was sent.'
        );
      }
      router.push(
        `/(auth)/verify-email?email=${encodeURIComponent(result.email)}&autoResend=false` as any
      );
    } catch (error) {
      appAlert('Sign Up Failed', formatAuthError(error));
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
            Create your account
          </ThemedText>
        </View>

        <View className="gap-4">
          <View key={`name-${autofillKey}`}>
            <TextInput
              className={errors.name ? input.error : input.base}
              placeholder="Full Name"
              placeholderTextColor={COLORS.mutedForeground}
              {...authNameProps}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => emailRef.current?.focus()}
              value={name}
              onChangeText={(t) => { setName(t); clearError('name'); }}
            />
            {errors.name ? (
              <Text className="mt-1 font-body text-sm text-destructive">{errors.name}</Text>
            ) : null}
          </View>

          <View key={`email-${autofillKey}`}>
            <TextInput
              ref={emailRef}
              className={errors.email ? input.error : input.base}
              placeholder="Email Address"
              placeholderTextColor={COLORS.mutedForeground}
              {...authEmailProps}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              value={email}
              onChangeText={(t) => { setEmail(t); clearError('email'); }}
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
              {...authNewPasswordProps}
              returnKeyType="go"
              onSubmitEditing={handleSignup}
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

          <View>
            <ThemedText type="small" themeColor="textSecondary" className="mb-1">
              I want to join as:
            </ThemedText>
            <View className="flex-row gap-2.5">
              {(['customer', 'barber'] as const).map((r) => (
                <HapticPressable
                  key={r}
                  className={`h-10 flex-1 items-center justify-center rounded-lg border ${role === r ? 'border-primary bg-primary/10' : 'border-border'}`}
                  onPress={() => setRole(r)}>
                  <ThemedText
                    className={`font-body text-[13px] ${role === r ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                    {r === 'customer' ? 'Customer' : 'Barber Shop'}
                  </ThemedText>
                </HapticPressable>
              ))}
            </View>
          </View>

          <Dropdown
            label="Select City"
            value={city}
            options={CITIES}
            onSelect={(value) => setCity(value as ProfileCity)}
          />

          <HapticPressable haptic="medium" className={btn.primary} onPress={handleSignup} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.primaryForeground} />
            ) : (
              <ThemedText className={btn.primaryText}>Create Account</ThemedText>
            )}
          </HapticPressable>

          <SocialSignInButtons />
        </View>

        <View className="mt-8 flex-row justify-center gap-1">
          <ThemedText type="small" themeColor="textSecondary">
            Already have an account?
          </ThemedText>
          <Link href={'/(auth)/login' as any} asChild>
            <HapticPressable>
              <ThemedText type="small" themeColor="primary" className="font-semibold">
                Sign In
              </ThemedText>
            </HapticPressable>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}
