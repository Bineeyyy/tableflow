import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from './server';
import type { Table, Reservation as AppReservation } from '@/types';
import type { Tables } from '@/types/database.types';

type DbTable = Tables<'restaurant_tables'>;
type DbReservation = Tables<'reservations'>;
type DbOrder = Tables<'orders'>;
type DbMenuCategory = Tables<'menu_categories'>;
type DbMenuItem = Tables<'menu_items'>;

const RESTAURANT_COOKIE = 'tf_restaurant_id';

function mapTable(t: DbTable): Table {
  return {
    id: t.id,
    number: t.number,
    seats: t.seats,
    current_guests: t.current_guests,
    status: t.status,
    x: t.pos_x,
    y: t.pos_y,
    shape: t.shape,
    label: t.label ?? undefined,
    zone: t.zone ?? undefined,
    seated_at: t.seated_at ?? undefined,
  };
}

// Defensive against schema drift or untyped rows reaching this mapper. The
// reservations columns are NOT NULL in the schema, but if that ever changes
// — or if a realtime/admin path bypasses the typed insert — `.slice` on a
// null reserved_time would throw and crash the page. Coerce instead.
function mapReservation(r: DbReservation): AppReservation {
  const time = typeof r.reserved_time === 'string' ? r.reserved_time.slice(0, 5) : '';
  return {
    id: r.id,
    name: r.customer_name ?? '',
    phone: r.customer_phone ?? '',
    date: r.reserved_date ?? '',
    // DB stores "HH:MM:SS", components expect "HH:MM"
    time,
    guests: r.party_size ?? 0,
    table_id: r.table_id ?? undefined,
    status: r.status,
    notes: r.notes ?? '',
    created_at: r.created_at ?? '',
  };
}

// React cache() dedupes calls within a single render pass so multiple
// components in the same page don't refetch the same Supabase data.
export const getMyRestaurant = cache(async () => {
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
});

export const getTablesForRestaurant = cache(async (restaurantId: string): Promise<Table[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('number');
  if (error || !data) return [];
  return data.map(mapTable);
});

export const getReservationsForRestaurant = cache(async (restaurantId: string): Promise<AppReservation[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('reserved_date')
    .order('reserved_time');
  if (error || !data) return [];
  return data.map(mapReservation);
});

// Count of today's reservations that are still "live" (anything except
// cancelled/completed). Used by the sidebar badge — kept as a separate
// query so we don't pull every reservation row just to compute a number.
export const getTodayActiveReservationCount = cache(async (restaurantId: string): Promise<number> => {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  const { count, error } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('reserved_date', today)
    .not('status', 'in', '(cancelled,completed)');
  if (error) return 0;
  return count ?? 0;
});

export const getOpenOrdersForRestaurant = cache(async (restaurantId: string): Promise<DbOrder[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'open');
  if (error || !data) return [];
  return data;
});

export const getMenuCategoriesForRestaurant = cache(async (restaurantId: string): Promise<DbMenuCategory[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('sort_order')
    .order('created_at');
  if (error || !data) return [];
  return data;
});

export const getMenuItemsForRestaurant = cache(async (restaurantId: string): Promise<DbMenuItem[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('sort_order')
    .order('created_at');
  if (error || !data) return [];
  return data;
});
