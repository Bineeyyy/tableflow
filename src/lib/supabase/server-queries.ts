import { cookies } from 'next/headers';
import { createClient } from './server';
import type { Table, Reservation as AppReservation } from '@/types';
import type { Tables } from '@/types/database.types';

type DbTable = Tables<'restaurant_tables'>;
type DbReservation = Tables<'reservations'>;
type DbOrder = Tables<'orders'>;

const RESTAURANT_COOKIE = 'tf_restaurant_id';

function mapTable(t: DbTable): Table {
  return {
    id: t.id,
    number: t.number,
    seats: t.seats,
    status: t.status,
    x: t.pos_x,
    y: t.pos_y,
    shape: t.shape,
    label: t.label ?? undefined,
  };
}

function mapReservation(r: DbReservation): AppReservation {
  return {
    id: r.id,
    name: r.customer_name,
    phone: r.customer_phone ?? '',
    date: r.reserved_date,
    // DB stores "HH:MM:SS", components expect "HH:MM"
    time: r.reserved_time.slice(0, 5),
    guests: r.party_size,
    table_id: r.table_id ?? undefined,
    status: r.status,
    notes: r.notes ?? '',
    created_at: r.created_at,
  };
}

export async function getMyRestaurant() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Prefer the restaurant pinned by the proxy cookie so the dashboard, settings,
  // and proxy stay consistent when a user has multiple restaurants.
  const cookieStore = await cookies();
  const cookieId = cookieStore.get(RESTAURANT_COOKIE)?.value;

  if (cookieId) {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', cookieId)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (data) return data;
  }

  const { data } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getTablesForRestaurant(restaurantId: string): Promise<Table[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('number');
  if (error || !data) return [];
  return data.map(mapTable);
}

export async function getReservationsForRestaurant(restaurantId: string): Promise<AppReservation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('reserved_date')
    .order('reserved_time');
  if (error || !data) return [];
  return data.map(mapReservation);
}

export async function getOpenOrdersForRestaurant(restaurantId: string): Promise<DbOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'open');
  if (error || !data) return [];
  return data;
}
