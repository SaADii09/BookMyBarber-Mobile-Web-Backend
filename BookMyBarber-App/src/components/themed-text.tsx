import { Text, type TextProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

const typeClasses: Record<NonNullable<ThemedTextProps['type']>, string> = {
  small: 'font-body text-sm leading-5 font-medium',
  smallBold: 'font-body text-sm leading-5 font-bold',
  default: 'font-body text-base leading-6 font-medium',
  title: 'font-heading text-5xl font-semibold leading-[52px]',
  subtitle: 'font-heading text-[32px] font-semibold leading-[44px]',
  link: 'font-body text-sm leading-[30px]',
  linkPrimary: 'font-body text-sm leading-[30px] text-primary',
  code: 'font-mono text-xs font-medium',
};

const themeColorClasses: Record<ThemeColor, string> = {
  text: 'text-foreground',
  background: 'text-background',
  backgroundElement: 'text-card',
  backgroundSelected: 'text-secondary-foreground',
  textSecondary: 'text-muted-foreground',
  primary: 'text-primary',
};

export function ThemedText({
  className,
  type = 'default',
  themeColor = 'text',
  ...rest
}: ThemedTextProps) {
  const colorClass = type === 'linkPrimary' ? '' : themeColorClasses[themeColor];
  const merged = [typeClasses[type], colorClass, className].filter(Boolean).join(' ');

  return <Text className={merged} {...rest} />;
}
