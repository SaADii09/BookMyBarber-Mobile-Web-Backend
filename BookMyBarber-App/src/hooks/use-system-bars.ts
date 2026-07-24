import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import { useSystemBarsContext } from '@/contexts/system-bars';

type BarStyle = 'dark' | 'light' | 'auto' | 'inverted';

interface SystemBarConfig {
  statusBarStyle: BarStyle;
  navigationBarStyle: BarStyle;
}

/**
 * Override system bar styles while the calling screen is focused.
 * Styles automatically reset to theme defaults when the screen loses focus
 * or the component unmounts.
 *
 * @example
 * ```ts
 * useSystemBars({
 *   statusBarStyle: 'light',      // white icons during dark overlay modal
 *   navigationBarStyle: 'light',  // light nav buttons
 * })
 * ```
 */
export function useSystemBars(config: Partial<SystemBarConfig>) {
  const { setBars, resetBars } = useSystemBarsContext();

  useFocusEffect(
    useCallback(() => {
      setBars(config);
      return () => resetBars();
    }, [config, setBars, resetBars]),
  );
}
