export type TableStatus = 'available' | 'occupied';
export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled';
export type MenuCategory = 'starters' | 'mains' | 'salads' | 'desserts' | 'drinks';

export interface Table {
  id: string;
  number: number;
  seats: number;
  current_guests: number;
  status: TableStatus;
  x: number;
  y: number;
  shape: 'round' | 'square' | 'rectangle';
  label?: string;
  current_order_id?: string;
}

export interface Order {
  id: string;
  table_id: string;
  status: 'open' | 'closed' | 'cancelled';
  total: number;
  created_at: string;
  closed_at?: string;
  guests: number;
  notes?: string;
}

export interface Reservation {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  table_id?: string;
  status: ReservationStatus;
  notes?: string;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category: MenuCategory;
  name: string;
  description?: string;
  price: number;
  available: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  owner_id: string;
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
}
