import React, { useState, useEffect } from "react";
import { View, TextInput, Switch } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { AppText } from "@/components/ui/app-text";
import { PrimaryButton } from "@/components/ui/primary-button";
import { MotiFadeIn } from "@/components/ui/moti-fade-in";
import { card, input } from "@/constants/ui-classes";
import { COLORS } from "@/constants/design-tokens";
import type { WorkingHourDay } from "@/lib/working-hours";

const DAYS = [
  { dayOfWeek: 1, short: "Monday" },
  { dayOfWeek: 2, short: "Tuesday" },
  { dayOfWeek: 3, short: "Wednesday" },
  { dayOfWeek: 4, short: "Thursday" },
  { dayOfWeek: 5, short: "Friday" },
  { dayOfWeek: 6, short: "Saturday" },
  { dayOfWeek: 0, short: "Sunday" },
];

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const parseTime = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

interface WorkingHoursEditorProps {
  hours: WorkingHourDay[];
  loading: boolean;
  onSave: (hours: WorkingHourDay[]) => Promise<void>;
  saving: boolean;
}

export function WorkingHoursEditor({ hours, loading, onSave, saving }: WorkingHoursEditorProps) {
  const [dayHours, setDayHours] = useState<WorkingHourDay[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!loading) {
      const merged = DAYS.map((d) => {
        const existing = hours.find((h) => h.dayOfWeek === d.dayOfWeek);
        return existing ?? {
          dayOfWeek: d.dayOfWeek,
          startTime: "09:00",
          endTime: "20:00",
          isActive: false,
        };
      });
      setDayHours(merged);
    }
  }, [hours, loading]);

  const validateDay = (day: WorkingHourDay): string | null => {
    if (!day.isActive) return null;
    if (!day.startTime || !day.endTime) return "Start and end time required";
    if (!TIME_REGEX.test(day.startTime) || !TIME_REGEX.test(day.endTime)) return "Use HH:MM format";
    if (parseTime(day.startTime) >= parseTime(day.endTime)) return "End time must be after start time";
    return null;
  };

  const validateAll = (): boolean => {
    const newErrors: Record<number, string> = {};
    let valid = true;
    dayHours.forEach((d) => {
      const err = validateDay(d);
      if (err) {
        newErrors[d.dayOfWeek] = err;
        valid = false;
      }
    });
    setErrors(newErrors);
    return valid;
  };

  const updateDay = (dayOfWeek: number, updates: Partial<WorkingHourDay>) => {
    setDayHours((prev) => {
      const next = prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...updates } : d));
      const updated = next.find((d) => d.dayOfWeek === dayOfWeek);
      if (updated) {
        const err = validateDay(updated);
        setErrors((e) => ({ ...e, [dayOfWeek]: err ?? "" }));
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!validateAll()) return;
    await onSave(dayHours);
  };

  const activeCount = dayHours.filter((d) => d.isActive).length;

  if (loading) {
    return (
      <View className="gap-3" style={{ minHeight: 300 }}>
        {DAYS.map((_, i) => (
          <View key={i} className={card.base}>
            <View className="h-5 bg-muted/50 rounded w-1/3" />
            <View className="h-8 bg-muted/50 rounded w-full mt-2" />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <AppText variant="heading" className="text-lg">Working Hours</AppText>
        <View className="bg-secondary rounded-full px-3 py-1">
          <ThemedText
            className="font-body text-sm"
            style={{ color: activeCount > 0 ? COLORS.chart2 : COLORS.mutedForeground }}
          >
            {activeCount}/7 active
          </ThemedText>
        </View>
      </View>

      <AppText variant="caption" className="text-muted-foreground">
        Toggle days on/off. Set custom start & end times in HH:MM format.
      </AppText>

      <View className="gap-3">
        {DAYS.map((day) => {
          const dh = dayHours.find((h) => h.dayOfWeek === day.dayOfWeek);
          if (!dh) return null;
          const error = errors[day.dayOfWeek];
          return (
            <MotiFadeIn
              key={day.dayOfWeek}
              transition={{ type: "timing", duration: 200, delay: day.dayOfWeek * 30 }}
            >
              <View className={`${card.base} ${!dh.isActive ? "opacity-50" : ""} gap-3`}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Switch
                      value={dh.isActive}
                      onValueChange={(v) => updateDay(day.dayOfWeek, { isActive: v })}
                      trackColor={{ false: COLORS.border, true: COLORS.primary }}
                      thumbColor={dh.isActive ? COLORS.primary : COLORS.background}
                    />
                    <ThemedText className="font-body font-medium text-foreground">
                      {day.short}
                    </ThemedText>
                  </View>
                </View>

                {dh.isActive && (
                  <View className="flex-row items-center gap-2 ml-2">
                    <View className="flex-1">
                      <AppText variant="label" className="text-xs mb-1">START</AppText>
                      <TextInput
                        className={`${input.base} ${error ? "border-destructive" : ""} text-center`}
                        placeholder="09:00"
                        placeholderTextColor={COLORS.mutedForeground}
                        value={dh.startTime}
                        onChangeText={(v) => {
                          const formatted = v.replace(/[^\d:]/g, "").slice(0, 5);
                          updateDay(day.dayOfWeek, { startTime: formatted });
                        }}
                        maxLength={5}
                        keyboardType="numeric"
                      />
                    </View>
                    <ThemedText className="text-muted-foreground mt-5 px-1">–</ThemedText>
                    <View className="flex-1">
                      <AppText variant="label" className="text-xs mb-1">END</AppText>
                      <TextInput
                        className={`${input.base} ${error ? "border-destructive" : ""} text-center`}
                        placeholder="20:00"
                        placeholderTextColor={COLORS.mutedForeground}
                        value={dh.endTime}
                        onChangeText={(v) => {
                          const formatted = v.replace(/[^\d:]/g, "").slice(0, 5);
                          updateDay(day.dayOfWeek, { endTime: formatted });
                        }}
                        maxLength={5}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                )}

                {error && (
                  <AppText variant="caption" className="text-destructive ml-2">{error}</AppText>
                )}
              </View>
            </MotiFadeIn>
          );
        })}

        <PrimaryButton loading={saving} onPress={handleSave} className="w-full">
          <ThemedText className="font-body font-semibold text-primary-foreground">
            Save Working Hours
          </ThemedText>
        </PrimaryButton>
      </View>
    </View>
  );
}