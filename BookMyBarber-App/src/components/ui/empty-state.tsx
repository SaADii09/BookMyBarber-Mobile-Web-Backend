import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';

import { PrimaryButton } from './primary-button';

export type EmptyStateProps = ViewProps & {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  const base = 'items-center justify-center py-12 px-6';
  const merged = className ? `${base} ${className}` : base;

  return (
    <View className={merged} {...props}>
      {icon ? <View className="mb-4">{icon}</View> : null}
      <ThemedText
        type="subtitle"
        themeColor="textSecondary"
        className="text-center mb-1">
        {title}
      </ThemedText>
      {description ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          className="text-center mb-4">
          {description}
        </ThemedText>
      ) : null}
      {action ? (
        <PrimaryButton onPress={action.onPress} className="mt-2 w-full max-w-[240px]">
          <ThemedText className="font-body font-semibold text-primary-foreground">
            {action.label}
          </ThemedText>
        </PrimaryButton>
      ) : null}
    </View>
  );
}
