import type { ReactNode } from 'react';
import { ActivityIndicator, type PressableProps } from 'react-native';

import { COLORS } from '@/constants/design-tokens';
import { HapticPressable } from './haptic-pressable';

export type PrimaryButtonProps = PressableProps & {
  children: ReactNode;
  loading?: boolean;
};

export function PrimaryButton({
  children,
  loading,
  disabled,
  className,
  ...props
}: PrimaryButtonProps) {
  const base =
    'bg-primary rounded-xl px-4 py-3 flex-row items-center justify-center gap-2 active:opacity-90';
  const merged = className ? `${base} ${className}` : base;
  const isDisabled = disabled || loading;

  return (
    <HapticPressable
      haptic="medium"
      disabled={isDisabled}
      className={`${merged}${isDisabled ? ' opacity-50' : ''}`}
      {...props}>
      {loading ? (
        <ActivityIndicator color={COLORS.primaryForeground} />
      ) : (
        <>{children}</>
      )}
    </HapticPressable>
  );
}
