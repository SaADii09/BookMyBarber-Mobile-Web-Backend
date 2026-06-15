/**
 * Legacy design tokens for StyleSheet screens.
 * New UI should use NativeWind semantic classes — see docs/design-system/.
 */

import { Platform } from 'react-native';

/** Synced with docs/design-system/tokens.ts */
const terracotta = {
  background: '#FBFAF9',
  foreground: '#14181F',
  card: '#FFFFFF',
  secondary: '#F0EDEA',
  mutedForeground: '#676F7E',
  primary: '#E77423',
  sidebarBackground: '#101318',
  sidebarForeground: '#E9E6E2',
  sidebarAccent: '#21242C',
  sidebarBorder: '#272C35',
} as const;

export const Colors = {
  light: {
    text: terracotta.foreground,
    background: terracotta.background,
    backgroundElement: terracotta.card,
    backgroundSelected: terracotta.secondary,
    textSecondary: terracotta.mutedForeground,
    primary: terracotta.primary,
  },
  dark: {
    text: terracotta.sidebarForeground,
    background: terracotta.sidebarBackground,
    backgroundElement: terracotta.sidebarAccent,
    backgroundSelected: terracotta.sidebarBorder,
    textSecondary: terracotta.mutedForeground,
    primary: terracotta.primary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Inter',
    serif: 'Playfair Display',
    rounded: 'Inter',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Inter',
    serif: 'Playfair Display',
    rounded: 'Inter',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-body)',
    serif: 'var(--font-heading)',
    rounded: 'var(--font-body)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
