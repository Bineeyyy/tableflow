import { createClient } from './client';
import { Tables, TablesInsert, TablesUpdate } from '@/types/database.types';
import type { Reservation as AppReservation, ReservationStatus } from '@/types';

function mapReservation(r: Tables<'reservations'>): AppReservation {
  return {
    id: r.id,
    name: r.customer_name,
    phone: r.customer_phone ?? '',
    date: r.reserved_date,
    time: r.reserved_time.slice(0, 5),
    guests: r.party_size,
    table_id: r.table_id ?? undefined,
    status: r.status,
    notes: r.notes ?? '',
    created_at: r.created_at,
  };
}

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

// ── Orders ─────────────────────────────────────────────────────────────────

export async function getOpenOrders(restaurantId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('orders')
    .select('*, restaurant_tables(number, label, seats)')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'open')
    .order('opened_at');
  if (error) throw error;
  return data;
}

export async function createOrder(input: TablesInsert<'orders'>) {
  const sb = createClient();
  const { data, error } = await sb
    .from('orders')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function closeOrder(orderId: string) {
  const sb = createClient();
  const { error } = await sb
    .from('orders')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

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

export async function createReservation(input: TablesInsert<'reservations'>) {
  const sb = createClient();
  const { data, error } = await sb
    .from('reservations')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReservationStatus(
  reservationId: string,
  status: TablesUpdate<'reservations'>['status']
) {
  const sb = createClient();
  const { error } = await sb
    .from('reservations')
    .update({ status })
    .eq('id', reservationId);
  if (error) throw error;
}

// Thrown when the partial unique index `reservations_table_slot_uniq` rejects a
// reservation because the same table+date+time is already taken by a non-terminal
// booking. The client surfaces the message verbatim.
export const DOUBLE_BOOKING_MESSAGE = 'Το τραπέζι είναι ήδη κρατημένο για αυτή την ώρα';
export class DoubleBookingError extends Error {
  constructor() { super(DOUBLE_BOOKING_MESSAGE); this.name = 'DoubleBookingError'; }
}

export async function upsertReservation(
  restaurantId: string,
  form: {
    name: string; phone: string; date: string; time: string;
    guests: number; table_id?: string; status: ReservationStatus; notes?: string;
  },
  id?: string
): Promise<AppReservation> {
  const sb = createClient();
  const payload = {
    customer_name: form.name,
    customer_phone: form.phone || null,
    reserved_date: form.date,
    reserved_time: form.time,
    party_size: form.guests,
    table_id: form.table_id || null,
    status: form.status,
    notes: form.notes || null,
    restaurant_id: restaurantId,
  };
  const { data, error } = id
    ? await sb.from('reservations').update(payload).eq('id', id).select().single()
    : await sb.from('reservations').insert(payload).select().single();
  if (error) {
    if (error.code === '23505') throw new DoubleBookingError();
    throw error;
  }
  return mapReservation(data);
}

export async function deleteReservation(id: string) {
  const sb = createClient();
  const { error } = await sb.from('reservations').delete().eq('id', id);
  if (error) throw error;
}

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
