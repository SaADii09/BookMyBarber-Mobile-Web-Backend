export interface ShopServiceRow {
  id: string;
  name: string;
  duration_minutes: number;
  price_pkr: number;
  description?: string | null;
}

export interface WorkerRow {
  id: string;
  name: string;
  specialties?: string[];
}

export interface WorkingHoursRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface BarberShopRow {
  id: string;
  name: string;
  city: string;
  address: string;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ShopDetailResponse {
  shop: BarberShopRow;
  workers: WorkerRow[];
  workingHours: WorkingHoursRow[];
  services: ShopServiceRow[];
}

export interface CustomerBookingRow {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  price_pkr: number;
  shop_services?: { name: string } | null;
  barber_shops?: {
    name: string;
    city: string;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  workers?: { name: string } | null;
}

export interface ShopNavTarget {
  name?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}
