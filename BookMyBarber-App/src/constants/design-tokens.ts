/**
 * Mobile copy of docs/design-system/tokens.ts (keep in sync).
 * Metro cannot import from docs/ at bundle time.
 */
/** Keep in sync with docs/design-system/tokens.ts COLORS */
export const COLORS = {
  primary: '#E77423',
  primaryForeground: '#FFFFFF',
  background: '#FBFAF9',
  splashBackground: '#FFFFFF',
  foreground: '#14181F',
  secondary: '#F0EDEA',
  secondaryForeground: '#1F242E',
  mutedForeground: '#676F7E',
  border: '#E5E0DC',
  chart2: '#2A9D90',
  chart4: '#E8C468',
  chart5: '#E76E50',
  destructive: '#DC2828',
} as const;

export const PLACEHOLDER_COLOR = COLORS.mutedForeground;
