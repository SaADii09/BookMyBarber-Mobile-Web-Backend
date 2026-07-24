import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  Keyboard,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { HapticPressable } from "@/components/ui/haptic-pressable";
import { AppText } from "@/components/ui/app-text";
import { PrimaryButton } from "@/components/ui/primary-button";
import { COLORS } from "@/constants/design-tokens";
import { input } from "@/constants/ui-classes";
import { MotiFadeIn } from "@/components/ui/moti-fade-in";
import { appAlert } from "@/lib/app-alert";
import type { ServiceFormData } from "@/lib/services";

interface ServiceFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ServiceFormData) => Promise<void>;
  initialData?: ServiceFormData | null;
  loading?: boolean;
  onDelete?: () => Promise<void>;
}

export function ServiceFormModal({
  visible,
  onClose,
  onSave,
  initialData,
  loading = false,
  onDelete,
}: ServiceFormModalProps) {
  const isEdit = !!initialData;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [pricePkr, setPricePkr] = useState("");

  const [nameError, setNameError] = useState("");
  const [durationError, setDurationError] = useState("");
  const [priceError, setPriceError] = useState("");

  useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? "");
      setDescription(initialData?.description ?? "");
      setDurationMinutes(String(initialData?.durationMinutes ?? ""));
      setPricePkr(String(initialData?.pricePkr ?? ""));
      setNameError("");
      setDurationError("");
      setPriceError("");
    }
  }, [visible, initialData]);

  const validate = (): boolean => {
    let valid = true;
    if (name.trim().length < 2) {
      setNameError("Name must be at least 2 characters");
      valid = false;
    } else {
      setNameError("");
    }
    const dur = Number(durationMinutes);
    if (!durationMinutes || isNaN(dur) || dur < 15) {
      setDurationError("Duration must be at least 15 minutes");
      valid = false;
    } else {
      setDurationError("");
    }
    const price = Number(pricePkr);
    if (!pricePkr || isNaN(price) || price < 50) {
      setPriceError("Price must be at least 50 PKR");
      valid = false;
    } else {
      setPriceError("");
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    Keyboard.dismiss();
    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      durationMinutes: Number(durationMinutes),
      pricePkr: Number(pricePkr),
    });
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    appAlert(
      "Delete Service",
      "This will deactivate the service. It will no longer be available for booking.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void onDelete() },
      ],
      { variant: "warning" }
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="justify-end"
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <MotiFadeIn>
              <View className="bg-background rounded-t-3xl max-h-[85vh]">
                <View className="px-5 pt-5 pb-3 border-b border-border">
                  <View className="flex-row items-center justify-between">
                    <AppText variant="heading" className="text-xl">
                      {isEdit ? "Edit Service" : "New Service"}
                    </AppText>
                    <HapticPressable
                      onPress={onClose}
                      className="w-8 h-8 rounded-full bg-secondary items-center justify-center"
                    >
                      <ThemedText className="text-foreground text-sm">✕</ThemedText>
                    </HapticPressable>
                  </View>
                </View>

                <ScrollView
                  className="px-5 pt-4"
                  contentContainerStyle={{ paddingBottom: 32, gap: 20 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View className="gap-1.5">
                    <AppText variant="label">SERVICE NAME</AppText>
                    <TextInput
                      className={`${input.base} ${nameError ? "border-destructive" : ""}`}
                      placeholder="e.g. Haircut"
                      placeholderTextColor={COLORS.mutedForeground}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      autoFocus
                    />
                    {nameError && (
                      <AppText variant="caption" className="text-destructive">{nameError}</AppText>
                    )}
                  </View>

                  <View className="gap-1.5">
                    <AppText variant="label">DESCRIPTION (OPTIONAL)</AppText>
                    <TextInput
                      className={input.multiline}
                      placeholder="Brief description of the service"
                      placeholderTextColor={COLORS.mutedForeground}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1 gap-1.5">
                      <AppText variant="label">DURATION (MIN)</AppText>
                      <TextInput
                        className={`${input.base} ${durationError ? "border-destructive" : ""}`}
                        placeholder="30"
                        placeholderTextColor={COLORS.mutedForeground}
                        value={durationMinutes}
                        onChangeText={(v) => setDurationMinutes(v.replace(/[^\d]/g, ""))}
                        keyboardType="number-pad"
                      />
                      {durationError && (
                        <AppText variant="caption" className="text-destructive">{durationError}</AppText>
                      )}
                    </View>

                    <View className="flex-1 gap-1.5">
                      <AppText variant="label">PRICE (PKR)</AppText>
                      <TextInput
                        className={`${input.base} ${priceError ? "border-destructive" : ""}`}
                        placeholder="500"
                        placeholderTextColor={COLORS.mutedForeground}
                        value={pricePkr}
                        onChangeText={(v) => setPricePkr(v.replace(/[^\d]/g, ""))}
                        keyboardType="number-pad"
                      />
                      {priceError && (
                        <AppText variant="caption" className="text-destructive">{priceError}</AppText>
                      )}
                    </View>
                  </View>

                  <View className="flex-row gap-3 pt-2">
                    <HapticPressable
                      className="flex-1 rounded-xl border border-border bg-secondary items-center justify-center py-3.5 active:opacity-80"
                      onPress={onClose}
                    >
                      <ThemedText className="font-body font-semibold text-foreground">Cancel</ThemedText>
                    </HapticPressable>
                    <PrimaryButton loading={loading} onPress={handleSubmit} className="flex-1" style={{ paddingVertical: 14 }}>
                      <ThemedText className="font-body font-semibold text-primary-foreground text-center">
                        {isEdit ? "Save Changes" : "Add Service"}
                      </ThemedText>
                    </PrimaryButton>
                  </View>

                  {isEdit && onDelete && (
                    <HapticPressable
                      className="border border-destructive rounded-xl items-center justify-center py-3.5 active:opacity-80"
                      onPress={handleDelete}
                    >
                      <ThemedText className="font-body font-semibold text-destructive">
                        Delete Service
                      </ThemedText>
                    </HapticPressable>
                  )}
                </ScrollView>
              </View>
            </MotiFadeIn>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}