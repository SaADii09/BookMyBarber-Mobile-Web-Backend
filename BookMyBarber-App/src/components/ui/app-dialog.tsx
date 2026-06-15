import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react-native';
import { Modal, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { COLORS } from '@/constants/design-tokens';
import { HapticPressable } from './haptic-pressable';
import { PrimaryButton } from './primary-button';

export type AppDialogVariant = 'info' | 'success' | 'error' | 'warning';

export type AppDialogButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type AppDialogConfig = {
  title: string;
  message?: string;
  variant?: AppDialogVariant;
  buttons?: AppDialogButton[];
};

type AppDialogProps = {
  visible: boolean;
  config: AppDialogConfig | null;
  onDismiss: () => void;
};

const VARIANT_STYLES: Record<
  AppDialogVariant,
  { border: string; icon: typeof Info; color: string }
> = {
  info: { border: 'border-primary/30', icon: Info, color: COLORS.primary },
  success: { border: 'border-chart-2/40', icon: CheckCircle2, color: COLORS.chart2 },
  warning: { border: 'border-chart-4/50', icon: TriangleAlert, color: COLORS.chart4 },
  error: { border: 'border-destructive/40', icon: AlertCircle, color: COLORS.destructive },
};

export function AppDialog({ visible, config, onDismiss }: AppDialogProps) {
  if (!config) return null;

  const variant = config.variant ?? 'info';
  const styles = VARIANT_STYLES[variant];
  const Icon = styles.icon;
  const buttons =
    config.buttons && config.buttons.length > 0
      ? config.buttons
      : [{ text: 'OK', style: 'default' as const }];

  const handlePress = (button: AppDialogButton) => {
    onDismiss();
    button.onPress?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View
          className={`w-full max-w-sm rounded-2xl border bg-card p-5 ${styles.border}`}
          style={{ borderCurve: 'continuous' }}>
          <View className="mb-3 flex-row items-start gap-3">
            <View className="mt-0.5 rounded-full bg-secondary p-2">
              <Icon size={22} color={styles.color} />
            </View>
            <View className="flex-1">
              <ThemedText className="font-heading text-lg font-bold text-foreground">
                {config.title}
              </ThemedText>
              {config.message ? (
                <ThemedText selectable className="mt-2 font-body text-sm text-muted-foreground">
                  {config.message}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <View className="gap-2">
            {buttons.map((button, index) => {
              const isPrimary = button.style !== 'cancel' && index === buttons.length - 1;
              if (isPrimary && button.style !== 'destructive') {
                return (
                  <PrimaryButton key={`${button.text}-${index}`} onPress={() => handlePress(button)}>
                    <ThemedText className="font-body font-semibold text-primary-foreground">
                      {button.text}
                    </ThemedText>
                  </PrimaryButton>
                );
              }
              const textClass =
                button.style === 'destructive'
                  ? 'font-body font-semibold text-destructive'
                  : 'font-body font-semibold text-foreground';
              return (
                <HapticPressable
                  key={`${button.text}-${index}`}
                  className="items-center justify-center rounded-xl border border-border bg-secondary px-4 py-3"
                  onPress={() => handlePress(button)}>
                  <ThemedText className={textClass}>{button.text}</ThemedText>
                </HapticPressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
