import * as NavigationBar from 'expo-navigation-bar';
import { setStatusBarStyle, StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

type BarStyle = 'dark' | 'light' | 'auto' | 'inverted';

interface SystemBarConfig {
  statusBarStyle: BarStyle;
  navigationBarStyle: BarStyle;
}

interface SystemBarsContextValue extends SystemBarConfig {
  setBars: (config: Partial<SystemBarConfig>) => void;
  resetBars: () => void;
}

const THEME_DEFAULTS: Record<'light' | 'dark', SystemBarConfig> = {
  light: { statusBarStyle: 'dark', navigationBarStyle: 'dark' },
  dark: { statusBarStyle: 'light', navigationBarStyle: 'light' },
} as const;

const SYSTEM_BAR_BG: Record<'light' | 'dark', string> = {
  light: '#FBFAF9',
  dark: '#101318',
} as const;

const SystemBarsContext = createContext<SystemBarsContextValue | null>(null);

export function useSystemBarsContext() {
  const ctx = useContext(SystemBarsContext);
  if (!ctx) throw new Error('useSystemBarsContext must be used within <SystemBarsProvider>');
  return ctx;
}

export function SystemBarsProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const defaults = THEME_DEFAULTS[theme];

  const [overrides, setOverrides] = useState<Partial<SystemBarConfig> | null>(null);

  const config: SystemBarConfig = overrides
    ? { ...defaults, ...overrides }
    : defaults;

  // Reset overrides when theme changes so bars always follow the active theme
  useEffect(() => {
    setOverrides(null);
  }, [theme]);

  // Sync navigation bar button style.
  // On Android 15+ (edge-to-edge) the nav bar is transparent — this only
  // controls the button color. Background is the root view bg + tab bar.
  useEffect(() => {
    NavigationBar.setStyle(config.navigationBarStyle);
  }, [config.navigationBarStyle]);

  // Imperatively sync status bar style in addition to the <StatusBar> component.
  // Some Android ROMs (MIUI, OneUI, colorOS) + splash screen transitions can cause
  // the component-based approach to not apply or to get stuck at a previous value.
  useEffect(() => {
    setStatusBarStyle(config.statusBarStyle);
  }, [config.statusBarStyle]);

  // Sync root view background to theme.
  // On Android 15+ (edge-to-edge), system bars are transparent — this color
  // shows through behind them. On older Android, app.json static config applies.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(SYSTEM_BAR_BG[theme]).catch(() => undefined);
  }, [theme]);

  const setBars = useCallback((partial: Partial<SystemBarConfig>) => {
    setOverrides((prev) => {
      const next = { ...(prev ?? {}), ...partial };
      // Drop keys set to undefined (caller wants theme default for that bar)
      for (const key of Object.keys(next) as (keyof SystemBarConfig)[]) {
        if (next[key] === undefined) delete next[key];
      }
      return Object.keys(next).length ? next : null;
    });
  }, []);

  const resetBars = useCallback(() => {
    setOverrides(null);
  }, []);

  // TypeScript needs the cast because `overrides` may have undefined values
  // after the filter above, but at runtime the values are always defined.
  const value = useMemo<SystemBarsContextValue>(
    () => ({ ...config, setBars, resetBars }),
    [config.navigationBarStyle, config.statusBarStyle, setBars, resetBars],
  );

  return (
    <SystemBarsContext.Provider value={value}>
      <StatusBar style={config.statusBarStyle} />
      {children}
    </SystemBarsContext.Provider>
  );
}
