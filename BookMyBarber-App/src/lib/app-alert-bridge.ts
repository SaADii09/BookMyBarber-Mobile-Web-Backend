import type { AppDialogConfig } from '@/components/ui/app-dialog';

let imperativeShowDialog: ((config: AppDialogConfig) => void) | null = null;

export function registerAppDialogShow(fn: ((config: AppDialogConfig) => void) | null) {
  imperativeShowDialog = fn;
}

export function getImperativeAppDialogShow() {
  return imperativeShowDialog;
}
