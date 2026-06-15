import { MotiView } from 'moti';
import type { ComponentProps, ReactNode } from 'react';

export type MotiFadeInProps = ComponentProps<typeof MotiView> & {
  children: ReactNode;
};

export function MotiFadeIn({ children, transition, ...props }: MotiFadeInProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={transition ?? { type: 'timing', duration: 300 }}
      {...props}>
      {children}
    </MotiView>
  );
}
