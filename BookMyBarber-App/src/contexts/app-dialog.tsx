import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { AppDialog, type AppDialogConfig } from '@/components/ui/app-dialog';
import { registerAppDialogShow } from '@/lib/app-alert-bridge';

type AppDialogContextValue = {
  showDialog: (config: AppDialogConfig) => void;
  dismissDialog: () => void;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AppDialogConfig | null>(null);

  const dismissDialog = useCallback(() => {
    setVisible(false);
    setConfig(null);
  }, []);

  const showDialog = useCallback((next: AppDialogConfig) => {
    setConfig(next);
    setVisible(true);
  }, []);

  useEffect(() => {
    registerAppDialogShow(showDialog);
    return () => registerAppDialogShow(null);
  }, [showDialog]);

  const value = useMemo(
    () => ({
      showDialog,
      dismissDialog,
    }),
    [showDialog, dismissDialog]
  );

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <AppDialog visible={visible} config={config} onDismiss={dismissDialog} />
    </AppDialogContext.Provider>
  );
}

export function useAppDialog(): AppDialogContextValue {
  const ctx = useContext(AppDialogContext);
  if (!ctx) {
    throw new Error('useAppDialog must be used within AppDialogProvider');
  }
  return ctx;
}
