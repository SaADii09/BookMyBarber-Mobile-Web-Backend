import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

const typeClasses: Record<ThemeColor, string> = {
  text: '',
  background: 'bg-background',
  backgroundElement: 'bg-card',
  backgroundSelected: 'bg-secondary',
  textSecondary: 'bg-muted',
  primary: 'bg-primary',
};

export function ThemedView({ className, type = 'background', ...otherProps }: ThemedViewProps) {
  const merged = [typeClasses[type], className].filter(Boolean).join(' ');
  return <View className={merged} {...otherProps} />;
}
