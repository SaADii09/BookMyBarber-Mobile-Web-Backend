/**
 * Machine-readable Elegant Terracotta tokens.
 * Canonical spec: docs/design-system/elegant-terracotta.md
 * Mobile dialogs: appAlert variants (info/success/error/warning) — see § Dialogs and feedback.
 */

export const FONT_HEADING = 'Playfair Display';
export const FONT_BODY = 'Inter';

/** Minimum size (pt) for Playfair Display headings */
export const TYPOGRAPHY_HEADING_MIN_PT = 22;

/** Body / UI text range (pt) */
export const TYPOGRAPHY_BODY_MIN_PT = 10;
export const TYPOGRAPHY_BODY_MAX_PT = 14;

export const COLORS = {
  background: '#FBFAF9',
  foreground: '#14181F',
  card: '#FFFFFF',
  cardForeground: '#14181F',
  popover: '#FFFFFF',
  popoverForeground: '#14181F',
  primary: '#E77423',
  primaryForeground: '#FFFFFF',
  secondary: '#F0EDEA',
  secondaryForeground: '#1F242E',
  muted: '#F1F0EE',
  mutedForeground: '#676F7E',
  accent: '#E8EAEE',
  accentForeground: '#1F242E',
  destructive: '#DC2828',
  destructiveForeground: '#FFFFFF',
  border: '#E5E0DC',
  input: '#E5E0DC',
  ring: '#E77423',
  sidebarBackground: '#101318',
  sidebarForeground: '#E9E6E2',
  sidebarPrimary: '#E77423',
  sidebarPrimaryForeground: '#FFFFFF',
  sidebarAccent: '#21242C',
  sidebarAccentForeground: '#E9E6E2',
  sidebarBorder: '#272C35',
  sidebarRing: '#E77423',
  chart1: '#E77423',
  chart2: '#2A9D90',
  chart3: '#333C4D',
  chart4: '#E8C468',
  chart5: '#E76E50',
} as const;

/** Hex values permitted in component TSX (plus token definition files). */
export const ALLOWED_HEX = Object.values(COLORS).map((h) => h.toLowerCase());

/** Legacy palette — flag in UI files; do not use in new code. */
export const DEPRECATED_COLORS = [
  '#3c87f7',
  '#2563eb',
  '#1d4ed8',
  '#0d0e11',
  '#161719',
  '#212225',
  '#2e3135',
] as const;

export const CSS_VARIABLE_FILES = [
  'BookMyBarber-App/src/global.css',
  'BookMyBarber-admin/src/index.css',
] as const;
