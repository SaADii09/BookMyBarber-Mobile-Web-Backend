import React, { useState, useEffect } from 'react';
import { View, TextInput, ActivityIndicator } from 'react-native';
import { ThemedText } from './themed-text';
import { GlassSurface, HapticPressable } from '@/components/ui';
import { btn, chip, input } from '@/constants/ui-classes';
import { ApiConnectivityBanner } from '@/components/api-connectivity-banner';
import {
  login,
  register,
  loginWithGoogle,
  loginWithMicrosoft,
  UserRole,
} from '@/lib/auth';
import { appAlert } from '@/lib/app-alert';
import { formatApiError } from '@/lib/network-error';
import { useGoogleAuth, signInWithMicrosoftOAuth } from '@/lib/oauth';

interface AuthOverlayProps {
  onAuthenticated: () => void;
}

type AuthMode = 'signin' | 'signup';

const CITIES = ['Gujranwala', 'Lahore', 'Vehari'] as const;

export function AuthOverlay({ onAuthenticated }: AuthOverlayProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [request, googleResponse, promptGoogle] = useGoogleAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [city, setCity] = useState<(typeof CITIES)[number]>('Lahore');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      googleResponse?.type === 'cancel' ||
      googleResponse?.type === 'dismiss' ||
      googleResponse?.type === 'error'
    ) {
      setIsLoading(false);
      return;
    }
    if (googleResponse?.type !== 'success') return;
    const idToken =
      googleResponse.authentication?.idToken ?? googleResponse.params?.id_token;
    if (!idToken) return;

    (async () => {
      setIsLoading(true);
      try {
        await loginWithGoogle(idToken);
        onAuthenticated();
      } catch (error: unknown) {
        appAlert(
          'Google Sign In Error',
          formatApiError(error, 'Google authentication failed')
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, [googleResponse, onAuthenticated]);

  const handleAuth = async () => {
    if (!email) {
      appAlert('Error', 'Please enter your email');
      return;
    }
    if (!password) {
      appAlert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register(email, password, role);
      }
      onAuthenticated();
    } catch (error: unknown) {
      appAlert('Auth Error', formatApiError(error, 'Failed to authenticate'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!request) {
      appAlert('Google Sign-In', 'Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your environment.');
      return;
    }
    setIsLoading(true);
    try {
      await promptGoogle();
    } catch (error: unknown) {
      appAlert(
        'Google Sign In Error',
        error instanceof Error ? error.message : 'Google authentication failed'
      );
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setIsLoading(true);
    try {
      const { code, redirectUri } = await signInWithMicrosoftOAuth();
      await loginWithMicrosoft(code, redirectUri);
      onAuthenticated();
    } catch (error: unknown) {
      appAlert(
        'Microsoft Sign In Error',
        formatApiError(error, 'Microsoft authentication failed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="absolute inset-0 z-[1000] items-center justify-center bg-black/85 px-5">
      <GlassSurface className="w-full max-w-[400px] rounded-2xl border border-border p-6">
        <ThemedText type="subtitle" className="text-center">
          BookMyBarber
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" className="mb-5 mt-1 text-center">
          Find & book the best barbers in Pakistan
        </ThemedText>

        <ApiConnectivityBanner />

        <View className="mb-4 flex-row rounded-lg bg-secondary p-1">
          <HapticPressable
            className={`flex-1 items-center rounded-md py-2 ${mode === 'signin' ? 'bg-card' : ''}`}
            onPress={() => setMode('signin')}>
            <ThemedText
              className={`font-body text-sm font-semibold ${mode === 'signin' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Sign In
            </ThemedText>
          </HapticPressable>
          <HapticPressable
            className={`flex-1 items-center rounded-md py-2 ${mode === 'signup' ? 'bg-card' : ''}`}
            onPress={() => setMode('signup')}>
            <ThemedText
              className={`font-body text-sm font-semibold ${mode === 'signup' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Sign Up
            </ThemedText>
          </HapticPressable>
        </View>

        <View className="mb-5 gap-3">
          {mode === 'signup' && (
            <TextInput
              className={input.base}
              placeholder="Full Name"
              placeholderTextColor="#676F7E"
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            className={input.base}
            placeholder="Email Address"
            placeholderTextColor="#676F7E"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            className={input.base}
            placeholder="Password"
            placeholderTextColor="#676F7E"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {mode === 'signup' && (
            <>
              <ThemedText type="small" themeColor="textSecondary" className="mb-1 mt-2">
                I want to join as:
              </ThemedText>
              <View className="flex-row gap-2.5">
                {(['customer', 'barber'] as const).map((r) => (
                  <HapticPressable
                    key={r}
                    className={`h-10 flex-1 items-center justify-center rounded-lg border ${role === r ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    onPress={() => setRole(r)}>
                    <ThemedText
                      className={`font-body text-[13px] ${role === r ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                      {r === 'customer' ? 'Customer' : 'Barber Shop'}
                    </ThemedText>
                  </HapticPressable>
                ))}
              </View>

              <ThemedText type="small" themeColor="textSecondary" className="mb-1 mt-2">
                Select City:
              </ThemedText>
              <View className="flex-row gap-2">
                {CITIES.map((c) => (
                  <HapticPressable
                    key={c}
                    className={`h-9 flex-1 items-center justify-center rounded-md border ${city === c ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    onPress={() => setCity(c)}>
                    <ThemedText
                      className={`font-body text-xs ${city === c ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                      {c}
                    </ThemedText>
                  </HapticPressable>
                ))}
              </View>
            </>
          )}
        </View>

        <HapticPressable haptic="medium" className={btn.primary} onPress={handleAuth} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText className={btn.primaryText}>
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </ThemedText>
          )}
        </HapticPressable>

        <View className="my-5 flex-row items-center">
          <View className="h-px flex-1 bg-border" />
          <ThemedText type="small" themeColor="textSecondary" className="px-2.5">
            OR
          </ThemedText>
          <View className="h-px flex-1 bg-border" />
        </View>

        <HapticPressable
          className={`${chip.base} h-12 items-center justify-center`}
          onPress={handleGoogleSignIn}
          disabled={isLoading || !request}>
          <ThemedText className="font-body text-[15px] font-semibold text-foreground">
            Continue with Google
          </ThemedText>
        </HapticPressable>

        <HapticPressable
          className={`${chip.base} mt-2.5 h-12 items-center justify-center`}
          onPress={handleMicrosoftSignIn}
          disabled={isLoading}>
          <ThemedText className="font-body text-[15px] font-semibold text-foreground">
            Continue with Microsoft
          </ThemedText>
        </HapticPressable>
      </GlassSurface>
    </View>
  );
}
