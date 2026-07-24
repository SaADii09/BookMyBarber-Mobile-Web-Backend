import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Modal, useColorScheme } from 'react-native';
import { WorkersSection } from '@/components/barber/workers-section';
import { WorkerFormModal } from '@/components/barber/worker-form-modal';
import { WorkerServicesModal } from '@/components/barber/worker-services-modal';
import { WorkerAvailabilityEditor } from '@/components/barber/worker-availability-editor';
import { useBarberStudio } from '@/contexts/barber-studio';
import { useSystemBars } from '@/hooks/use-system-bars';
import { appAlert } from '@/lib/app-alert';
import { formatApiError } from '@/lib/network-error';
import {
  createWorker,
  deleteWorker,
  fetchWorkers,
  updateWorker,
  type WorkerFormData,
} from '@/lib/workers';
import {
  fetchWorkerServices,
  replaceWorkerServices,
} from '@/lib/worker-services';
import {
  fetchWorkerAvailability,
  updateWorkerAvailability,
} from '@/lib/worker-availability';
import type { WorkingHourDay } from '@/lib/working-hours';

export default function WorkersPage() {
  const scheme = useColorScheme();
  const { selectedShopId } = useBarberStudio();

  const [workers, setWorkers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  // Worker form modal
  const [workerModalVisible, setWorkerModalVisible] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerFormData | null>(null);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [savingWorker, setSavingWorker] = useState(false);

  // Worker services modal
  const [workerServicesModalVisible, setWorkerServicesModalVisible] = useState(false);
  const [workerServicesTarget, setWorkerServicesTarget] = useState<Record<string, unknown> | null>(null);
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);

  // Worker availability modal
  const [workerAvailModalVisible, setWorkerAvailModalVisible] = useState(false);
  const [workerAvailTarget, setWorkerAvailTarget] = useState<Record<string, unknown> | null>(null);
  const [workerAvailHours, setWorkerAvailHours] = useState<WorkingHourDay[]>([]);
  const [workerAvailLoading, setWorkerAvailLoading] = useState(false);
  const [savingWorkerAvail, setSavingWorkerAvail] = useState(false);

  const anyModalOpen = !!(
    workerModalVisible ||
    workerServicesModalVisible ||
    workerAvailModalVisible
  );

  useSystemBars({
    statusBarStyle: anyModalOpen ? 'light' : scheme === 'dark' ? 'light' : 'dark',
    navigationBarStyle: scheme === 'dark' ? 'light' : 'dark',
  });

  const loadWorkers = useCallback(async () => {
    if (!selectedShopId) return;
    setLoading(true);
    try {
      const data = await fetchWorkers(selectedShopId);
      setWorkers(data);
    } catch (err) {
      appAlert('Load failed', formatApiError(err, 'Could not load workers'), undefined, {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedShopId]);

  useEffect(() => {
    void loadWorkers();
  }, [loadWorkers]);

  const handleOpenAdd = () => {
    setEditingWorker(null);
    setEditingWorkerId(null);
    setWorkerModalVisible(true);
  };

  const handleOpenEdit = (worker: Record<string, unknown>) => {
    const raw = worker.specialties as string[] | undefined;
    setEditingWorker({
      name: worker.name as string,
      phone: (worker.phone as string) ?? undefined,
      specialties: raw ? raw.join(', ') : '',
      avatarUrl: (worker.avatar_url as string) ?? undefined,
    });
    setEditingWorkerId(worker.id as string);
    setWorkerModalVisible(true);
  };

  const handleSave = async (data: WorkerFormData) => {
    if (!selectedShopId) return;
    setSavingWorker(true);
    try {
      if (editingWorkerId) {
        await updateWorker(selectedShopId, editingWorkerId, data);
        appAlert('Updated', 'Worker updated', undefined, { variant: 'success' });
      } else {
        await createWorker(selectedShopId, data);
        appAlert('Added', 'Worker added', undefined, { variant: 'success' });
      }
      setWorkerModalVisible(false);
      setEditingWorker(null);
      setEditingWorkerId(null);
      await loadWorkers();
    } catch (err) {
      appAlert('Save failed', formatApiError(err, 'Could not save worker'), undefined, {
        variant: 'error',
      });
    } finally {
      setSavingWorker(false);
    }
  };

  const handleDelete = async (worker: Record<string, unknown>) => {
    if (!selectedShopId) return;
    appAlert(
      'Remove Worker',
      `Deactivate "${worker.name as string}"? They will no longer take bookings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorker(selectedShopId, worker.id as string);
              appAlert('Removed', 'Worker deactivated', undefined, { variant: 'success' });
              await loadWorkers();
            } catch (err) {
              appAlert('Remove failed', formatApiError(err, 'Could not remove worker'), undefined, {
                variant: 'error',
              });
            }
          },
        },
      ],
      { variant: 'warning' },
    );
  };

  const handleOpenAssignServices = async (worker: Record<string, unknown>) => {
    setWorkerServicesTarget(worker);
    setWorkerServicesModalVisible(true);
    try {
      const result = await fetchWorkerServices(selectedShopId!, worker.id as string);
      setAssignedServiceIds(result.map((r) => r.service_id));
    } catch {
      setAssignedServiceIds([]);
    }
  };

  const handleSaveWorkerServices = async (serviceIds: string[]) => {
    if (!selectedShopId || !workerServicesTarget) return;
    await replaceWorkerServices(selectedShopId, workerServicesTarget.id as string, serviceIds);
    await loadWorkers();
  };

  const handleOpenWorkerAvailability = async (worker: Record<string, unknown>) => {
    setWorkerAvailTarget(worker);
    setWorkerAvailLoading(true);
    setWorkerAvailModalVisible(true);
    try {
      const result = await fetchWorkerAvailability(selectedShopId!, worker.id as string);
      const hours: WorkingHourDay[] = result.map((r) => ({
        dayOfWeek: r.day_of_week,
        startTime: r.start_time.slice(0, 5),
        endTime: r.end_time.slice(0, 5),
        isActive: r.is_active,
      }));
      setWorkerAvailHours(hours);
    } catch {
      setWorkerAvailHours([]);
    } finally {
      setWorkerAvailLoading(false);
    }
  };

  const handleSaveWorkerAvailability = async (hours: WorkingHourDay[]) => {
    if (!selectedShopId || !workerAvailTarget) return;
    setSavingWorkerAvail(true);
    try {
      await updateWorkerAvailability(selectedShopId, workerAvailTarget.id as string, hours);
      appAlert('Saved', 'Worker hours updated', undefined, { variant: 'success' });
      setWorkerAvailModalVisible(false);
      setWorkerAvailTarget(null);
    } catch (err) {
      appAlert('Save failed', formatApiError(err, 'Could not save hours'), undefined, {
        variant: 'error',
      });
    } finally {
      setSavingWorkerAvail(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pt-4"
    >
      <WorkersSection
        workers={workers.map((w) => ({
          ...w,
          id: w.id as string,
          name: w.name as string,
          phone: w.phone as string | null | undefined,
          specialties: w.specialties as string[] | undefined,
          avatar_url: w.avatar_url as string | null | undefined,
          is_active: w.is_active as boolean | undefined,
        }))}
        loading={loading}
        onAddPress={handleOpenAdd}
        onEditPress={(w) => handleOpenEdit(w as unknown as Record<string, unknown>)}
        onDeletePress={(w) => handleDelete(w as unknown as Record<string, unknown>)}
        onAssignServices={(w) => handleOpenAssignServices(w as unknown as Record<string, unknown>)}
        onManageAvailability={(w) => handleOpenWorkerAvailability(w as unknown as Record<string, unknown>)}
      />

      <WorkerFormModal
        visible={workerModalVisible}
        onClose={() => setWorkerModalVisible(false)}
        onSave={handleSave}
        initialData={editingWorker}
        loading={savingWorker}
        onDelete={
          editingWorkerId && selectedShopId
            ? async () => {
                try {
                  await deleteWorker(selectedShopId, editingWorkerId);
                  setWorkerModalVisible(false);
                  setEditingWorker(null);
                  setEditingWorkerId(null);
                  appAlert('Removed', 'Worker deactivated', undefined, { variant: 'success' });
                  await loadWorkers();
                } catch (err) {
                  appAlert('Delete failed', formatApiError(err, 'Could not delete'), undefined, {
                    variant: 'error',
                  });
                }
              }
            : undefined
        }
      />

      <WorkerServicesModal
        visible={workerServicesModalVisible}
        onClose={() => setWorkerServicesModalVisible(false)}
        onSave={handleSaveWorkerServices}
        allServices={[]}
        assignedServiceIds={assignedServiceIds}
        workerName={(workerServicesTarget?.name as string) ?? 'Worker'}
      />

      <Modal
        visible={workerAvailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWorkerAvailModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-background rounded-t-3xl h-[85vh] px-5 pt-5 pb-8">
            <WorkerAvailabilityEditor
              hours={workerAvailHours}
              loading={workerAvailLoading}
              onSave={handleSaveWorkerAvailability}
              saving={savingWorkerAvail}
              workerName={(workerAvailTarget?.name as string) ?? 'Worker'}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
