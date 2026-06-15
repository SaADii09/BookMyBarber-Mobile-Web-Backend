import { Stack } from 'expo-router/stack';

export default function BookLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
      }}
    />
  );
}
