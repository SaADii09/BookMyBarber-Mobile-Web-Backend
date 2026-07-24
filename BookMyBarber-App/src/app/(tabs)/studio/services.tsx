import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ServicesSection } from '@/components/barber/services-section';
import { ServiceFormModal } from '@/components/barber/service-form-modal';
import { useBarberStudio } from '@/contexts/barber-studio';
import { useSystemBars } from '@/hooks/use-system-bars';
import { appAlert } from '@/lib/app-alert';
import { formatApiError } from '@/lib/network-error';
import { COLORS } from '@/constants/design-tokens';
import {
  createService,
  deleteService,
  fetchServices,
  updateService,
  type ServiceFormData,
} from '@/lib/services';
import type { ShopServiceRow } from '@/lib/booking-types';

export default function ServicesPage() {
  const scheme = useColorScheme();
  const { selectedShopId } = useBarberStudio();

  const [services, setServices] = useState<ShopServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ServiceFormData | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  useSystemBars({
    statusBarStyle: scheme === 'dark' ? 'light' : 'dark',
    navigationBarStyle: scheme === 'dark' ? 'light' : 'dark',
  });

  const loadServices = useCallback(
    async (showLoading = true) => {
      if (!selectedShopId) return;
      if (showLoading) setLoading(true);
      try {
        const data = await fetchServices(selectedShopId);
        setServices(data);
      } catch (err) {
        appAlert('Load failed', formatApiError(err, 'Could not load services'), undefined, {
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    },
    [selectedShopId],
  );

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadServices(false);
    } finally {
      setRefreshing(false);
    }
  }, [loadServices]);

  const handleOpenAdd = () => {
    setEditingService(null);
    setEditingServiceId(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (service: ShopServiceRow) => {
    setEditingService({
      name: service.name,
      description: service.description ?? undefined,
      durationMinutes: service.duration_minutes,
      pricePkr: service.price_pkr,
    });
    setEditingServiceId(service.id);
    setModalVisible(true);
  };

  const handleSave = async (data: ServiceFormData) => {
    if (!selectedShopId) return;
    setSaving(true);
    try {
      if (editingServiceId) {
        await updateService(selectedShopId, editingServiceId, data);
        appAlert('Updated', 'Service updated successfully', undefined, { variant: 'success' });
      } else {
        await createService(selectedShopId, data);
        appAlert('Added', 'Service created successfully', undefined, { variant: 'success' });
      }
      setModalVisible(false);
      setEditingService(null);
      setEditingServiceId(null);
      await loadServices(false);
    } catch (err) {
      appAlert('Save failed', formatApiError(err, 'Could not save service'), undefined, {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service: ShopServiceRow) => {
    if (!selectedShopId) return;
    appAlert(
      'Delete Service',
      `Deactivate "${service.name}"? It will no longer be available for booking.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteService(selectedShopId, service.id);
              appAlert('Deleted', 'Service deactivated', undefined, { variant: 'success' });
              await loadServices(false);
            } catch (err) {
              appAlert('Delete failed', formatApiError(err, 'Could not delete service'), undefined, {
                variant: 'error',
              });
            }
          },
        },
      ],
      { variant: 'warning' },
    );
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pt-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
      }
    >
      <ServicesSection
        services={services}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onAddPress={handleOpenAdd}
        onEditPress={handleOpenEdit}
        onDeletePress={handleDelete}
      />

      <ServiceFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        initialData={editingService}
        loading={saving}
        onDelete={
          editingServiceId && selectedShopId
            ? async () => {
                try {
                  await deleteService(selectedShopId, editingServiceId);
                  setModalVisible(false);
                  setEditingService(null);
                  setEditingServiceId(null);
                  appAlert('Deleted', 'Service deactivated', undefined, { variant: 'success' });
                  await loadServices(false);
                } catch (err) {
                  appAlert('Delete failed', formatApiError(err, 'Could not delete'), undefined, {
                    variant: 'error',
                  });
                }
              }
            : undefined
        }
      />
    </ScrollView>
  );
}
