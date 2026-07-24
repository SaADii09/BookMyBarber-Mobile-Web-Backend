import { Text, type TextProps } from 'react-native';

// @deprecated — use ThemedText instead. Existing usage is fine; new code should use ThemedText.

export type AppTextVariant = 'heading' | 'body' | 'caption' | 'label';

export type AppTextProps = TextProps & {
  variant?: AppTextVariant;
};

const variantClasses: Record<AppTextVariant, string> = {
  heading: 'font-heading text-foreground',
  body: 'font-body text-foreground',
  caption: 'font-body text-sm text-muted-foreground',
  label: 'font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground',
};

export function AppText({ variant = 'body', className, ...props }: AppTextProps) {
  const base = variantClasses[variant];
  const merged = className ? `${base} ${className}` : base;
  return <Text className={merged} {...props} />;
}
