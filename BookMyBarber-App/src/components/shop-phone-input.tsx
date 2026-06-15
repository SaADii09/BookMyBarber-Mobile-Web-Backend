import { View, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { home } from "@/constants/home-ui";
import {
  formatPakistanPhoneDisplay,
  sanitizePakistanPhoneInput,
} from "@/lib/pakistan-phone";

type ShopPhoneInputProps = {
  value: string;
  onChangeValue: (nationalDigits: string) => void;
};

export function ShopPhoneInput({ value, onChangeValue }: ShopPhoneInputProps) {
  return (
    <View>
      <ThemedText type="smallBold" className="mb-1">
        Business phone
      </ThemedText>
      <View className="flex-row items-center gap-2">
        <View className="rounded-xl border border-border bg-muted px-3 py-3">
          <ThemedText type="smallBold" selectable>
            +92
          </ThemedText>
        </View>
        <TextInput
          className={`${home.modalInput} flex-1`}
          placeholder="300 1234567"
          placeholderTextColor="#676F7E"
          value={formatPakistanPhoneDisplay(value)}
          onChangeText={(text) => onChangeValue(sanitizePakistanPhoneInput(text))}
          keyboardType="phone-pad"
          maxLength={11}
          accessibilityLabel="Pakistan mobile number without country code"
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary" className="mt-1">
        10 digits starting with 3 (e.g. 300, 321, 333)
      </ThemedText>
    </View>
  );
}
