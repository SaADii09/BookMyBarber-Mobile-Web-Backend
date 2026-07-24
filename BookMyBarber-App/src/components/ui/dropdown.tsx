import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { COLORS } from '@/constants/design-tokens';

export interface DropdownOption {
  label: string;
  value: string;
}

export interface DropdownProps {
  label?: string;
  value: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  error?: string;
}

export function Dropdown({ label, value, options, onSelect, error }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      {label ? (
        <Text className="mb-1.5 font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </Text>
      ) : null}
      <Pressable
        className={`flex-row items-center rounded-xl border px-4 py-3 ${error ? 'border-destructive' : 'border-input'} bg-card`}
        onPress={() => setOpen(true)}>
        <Text className="flex-1 font-body text-foreground">
          {selected?.label ?? 'Select...'}
        </Text>
        <ChevronDown size={18} color={COLORS.mutedForeground} />
      </Pressable>
      {error ? (
        <Text className="mt-1 font-body text-sm text-destructive">{error}</Text>
      ) : null}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={() => setOpen(false)}>
          <Pressable
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-2"
            onPress={() => undefined}>
            <ScrollView className="max-h-64">
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    className={`flex-row items-center rounded-xl px-4 py-3.5 ${active ? 'bg-primary/10' : ''}`}
                    onPress={() => {
                      onSelect(option.value);
                      setOpen(false);
                    }}>
                    <Text
                      className={`flex-1 font-body text-[15px] ${active ? 'font-semibold text-primary' : 'text-foreground'}`}>
                      {option.label}
                    </Text>
                    {active ? (
                      <Text className="text-primary" style={{ fontSize: 18 }}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
