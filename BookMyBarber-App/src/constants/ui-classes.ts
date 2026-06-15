/** Shared NativeWind class strings — Elegant Terracotta design system */

export const screen = {
  root: 'flex-1 bg-background',
  padded: 'flex-1 bg-background p-5',
  center: 'flex-1 items-center justify-center bg-background',
  scrollContent: 'p-5 gap-4',
} as const;

export const card = {
  base: 'bg-card border border-border rounded-xl p-4',
  row: 'bg-card border border-border rounded-xl p-4 mt-2',
} as const;

export const input = {
  base: 'bg-card border border-input rounded-xl px-4 py-3 text-foreground font-body',
  multiline: 'bg-card border border-input rounded-xl px-4 py-3 text-foreground font-body min-h-[120px]',
} as const;

export const chip = {
  base: 'rounded-xl border border-border bg-card px-3 py-2.5',
  active: 'border-primary',
  text: 'font-body text-foreground',
} as const;

export const btn = {
  primary: 'bg-primary rounded-xl px-4 py-3 items-center justify-center active:opacity-90',
  primaryText: 'font-body font-semibold text-primary-foreground',
  secondary: 'rounded-xl border border-primary px-3 py-2.5',
  secondaryText: 'font-body text-primary',
} as const;
