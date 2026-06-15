import type { AppDialogButton, AppDialogConfig, AppDialogVariant } from '@/components/ui/app-dialog';
import { getImperativeAppDialogShow } from '@/lib/app-alert-bridge';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type AppAlertOptions = {
  variant?: AppDialogVariant;
};

function inferVariant(title: string, explicit?: AppDialogVariant): AppDialogVariant {
  if (explicit) return explicit;
  const t = title.toLowerCase();
  if (t.includes('error') || t.includes('failed') || t.includes('invalid')) return 'error';
  if (t.includes('success') || t.includes('saved') || t.includes('submitted') || t.includes('registered'))
    return 'success';
  if (t.includes('permission') || t.includes('missing') || t.includes('required') || t.includes('needed'))
    return 'warning';
  return 'info';
}

/**
 * Design-system dialog — drop-in replacement for React Native `Alert.alert`.
 */
export function appAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AppAlertOptions
): void {
  const show = getImperativeAppDialogShow();
  const config: AppDialogConfig = {
    title,
    message,
    variant: inferVariant(title, options?.variant),
    buttons: buttons?.map(
      (b): AppDialogButton => ({
        text: b.text,
        onPress: b.onPress,
        style: b.style,
      })
    ),
  };
  if (show) {
    show(config);
    return;
  }
  console.warn('[appAlert] AppDialogProvider not mounted:', title, message);
}
