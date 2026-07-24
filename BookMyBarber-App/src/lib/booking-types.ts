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
  phone?: string | null;
  specialties?: string[];
  avatar_url?: string | null;
  is_active?: boolean;
}

export interface WorkerServiceRow {
  id: string;
  worker_id: string;
  service_id: string;
}

export interface WorkerAvailabilityRow {
  id: string;
  worker_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
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
  description?: string | null;
  business_phone?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface BarberShopSummary extends BarberShopRow {
  worker_count: number;
  service_count: number;
  has_active_hours: boolean;
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

export interface ServiceFormData {
  name: string;
  description?: string;
  durationMinutes: number;
  pricePkr: number;
}

export interface WorkingHourDay {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}
