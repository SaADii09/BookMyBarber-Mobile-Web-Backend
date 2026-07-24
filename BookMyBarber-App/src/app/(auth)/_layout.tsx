import { Stack } from 'expo-router/stack';

const noHeader = {
  headerShown: false,
  header: () => null,
  title: '',
} as const;

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        ...noHeader,
        animation: 'slide_from_right',
        animationDuration: 200,
      }}>
      <Stack.Screen name="index" options={noHeader} />
      <Stack.Screen name="login" options={noHeader} />
      <Stack.Screen name="signup" options={noHeader} />
      <Stack.Screen name="forgot-password" options={noHeader} />
      <Stack.Screen name="verify-reset-code" options={noHeader} />
      <Stack.Screen name="reset-password" options={noHeader} />
      <Stack.Screen name="verify-email" options={noHeader} />
      <Stack.Screen name="account-locked" options={{ ...noHeader, gestureEnabled: false }} />
    </Stack>
  );
}
