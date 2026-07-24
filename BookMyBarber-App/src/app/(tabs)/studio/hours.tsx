import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, useColorScheme } from 'react-native';
import { WorkingHoursEditor } from '@/components/barber/working-hours-editor';
import { useBarberStudio } from '@/contexts/barber-studio';
import { useSystemBars } from '@/hooks/use-system-bars';
import { appAlert } from '@/lib/app-alert';
import { formatApiError } from '@/lib/network-error';
import {
  fetchWorkingHours,
  updateWorkingHours,
  type WorkingHourDay,
} from '@/lib/working-hours';
import type { WorkingHoursRow } from '@/lib/booking-types';

const transformHoursRow = (row: WorkingHoursRow): WorkingHourDay => ({
  dayOfWeek: row.day_of_week,
  startTime: row.start_time.slice(0, 5),
  endTime: row.end_time.slice(0, 5),
  isActive: row.is_active,
});

export default function HoursPage() {
  const scheme = useColorScheme();
  const { selectedShopId } = useBarberStudio();

  const [hours, setHours] = useState<WorkingHourDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useSystemBars({
    statusBarStyle: scheme === 'dark' ? 'light' : 'dark',
    navigationBarStyle: scheme === 'dark' ? 'light' : 'dark',
  });

  const loadHours = useCallback(async () => {
    if (!selectedShopId) return;
    setLoading(true);
    try {
      const rows = await fetchWorkingHours(selectedShopId);
      setHours(rows.map(transformHoursRow));
    } catch (err) {
      appAlert('Load failed', formatApiError(err, 'Could not load working hours'), undefined, {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedShopId]);

  useEffect(() => {
    void loadHours();
  }, [loadHours]);

  const handleSave = async (data: WorkingHourDay[]) => {
    if (!selectedShopId) return;
    setSaving(true);
    try {
      await updateWorkingHours(selectedShopId, data);
      appAlert('Hours saved', 'Working hours updated successfully', undefined, {
        variant: 'success',
      });
    } catch (err) {
      appAlert('Save failed', formatApiError(err, 'Could not save working hours'), undefined, {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="px-5 pt-4">
      <WorkingHoursEditor
        hours={hours}
        loading={loading}
        onSave={handleSave}
        saving={saving}
      />
    </ScrollView>
  );
}
