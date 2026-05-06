import { createClient } from './client';
import { TablesInsert, TablesUpdate } from '@/types/database.types';

// ── Restaurant ─────────────────────────────────────────────────────────────

export async function getMyRestaurants() {
  const sb = createClient();
  const { data, error } = await sb
    .from('restaurants')
    .select('*, restaurant_members(role)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createRestaurant(input: TablesInsert<'restaurants'>) {
  const sb = createClient();
  const { data, error } = await sb
    .from('restaurants')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Tables (floor plan) ────────────────────────────────────────────────────

export async function getTables(restaurantId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('restaurant_tables')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('number');
  if (error) throw error;
  return data;
}

export async function updateTableStatus(
  tableId: string,
  status: TablesUpdate<'restaurant_tables'>['status']
) {
  const sb = createClient();
  const { error } = await sb
    .from('restaurant_tables')
    .update({ status })
    .eq('id', tableId);
  if (error) throw error;
}

// Orders helpers were deleted along with the orders feature in 58a9ae2.
// The `orders` table may still exist server-side, but the UI no longer
// reads or writes it. Re-add helpers from a fresh design rather than
// reviving the old ones — they assumed a status enum and join shape that
// the rest of the app no longer uses.

// ── Reservations ───────────────────────────────────────────────────────────

export async function getReservations(restaurantId: string, date?: string) {
  const sb = createClient();
  let q = sb
    .from('reservations')
    .select('*, restaurant_tables(number, label, seats)')
    .eq('restaurant_id', restaurantId)
    .order('reserved_date')
    .order('reserved_time');
  if (date) q = q.eq('reserved_date', date);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// Reservation writes live in @/app/actions/reservations — those routes go
// through 'use server' with restaurant scoping and Greek validation. The
// browser client only reads reservations here.

// ── Menu ───────────────────────────────────────────────────────────────────

export async function getMenuItems(restaurantId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('menu_items')
    .select('*, menu_categories(name, slug)')
    .eq('restaurant_id', restaurantId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function upsertMenuItem(input: TablesInsert<'menu_items'>) {
  const sb = createClient();
  const { data, error } = await sb
    .from('menu_items')
    .upsert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMenuItem(itemId: string) {
  const sb = createClient();
  const { error } = await sb.from('menu_items').delete().eq('id', itemId);
  if (error) throw error;
}
