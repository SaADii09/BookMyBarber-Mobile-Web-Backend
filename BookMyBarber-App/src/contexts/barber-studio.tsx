import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ShopOption } from '@/components/barber/shop-selector';
import { appAlert } from '@/lib/app-alert';
import { formatApiError } from '@/lib/network-error';

interface BarberStudioContextValue {
  shops: ShopOption[];
  selectedShopId: string | null;
  loading: boolean;
  setSelectedShop: (id: string) => void;
  refreshShops: () => Promise<void>;
}

const BarberStudioContext = createContext<BarberStudioContextValue | null>(null);

export function BarberStudioProvider({
  children,
  preselectedShopId,
}: {
  children: React.ReactNode;
  preselectedShopId?: string | null;
}) {
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshShops = useCallback(async () => {
    try {
      const { data } = await api.get('/app/shops/my');
      const list: ShopOption[] = (data.shops || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        name: s.name as string,
        city: s.city as string,
        status: s.status as string,
      }));
      setShops(list);
    } catch (err) {
      appAlert('Failed', formatApiError(err, 'Could not load your shops'), undefined, {
        variant: 'error',
      });
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshShops();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshShops]);

  useEffect(() => {
    if (shops.length > 0) {
      if (preselectedShopId && shops.some(s => s.id === preselectedShopId) && selectedShopId !== preselectedShopId) {
        setSelectedShopId(preselectedShopId);
      } else if (!selectedShopId) {
        setSelectedShopId(shops[0].id);
      }
    }
  }, [shops, preselectedShopId, selectedShopId]);

  const setSelectedShop = useCallback((id: string) => {
    setSelectedShopId(id);
  }, []);

  return (
    <BarberStudioContext.Provider
      value={{ shops, selectedShopId, loading, setSelectedShop, refreshShops }}
    >
      {children}
    </BarberStudioContext.Provider>
  );
}

export function useBarberStudio(): BarberStudioContextValue {
  const ctx = useContext(BarberStudioContext);
  if (!ctx) throw new Error('useBarberStudio must be used within BarberStudioProvider');
  return ctx;
}
