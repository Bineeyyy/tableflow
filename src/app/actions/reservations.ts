'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import type { Tables } from '@/types/database.types'
import type { Reservation, ReservationStatus } from '@/types'

const RESTAURANT_COOKIE = 'tf_restaurant_id'

const VALID_STATUSES: readonly ReservationStatus[] = [
  'pending', 'confirmed', 'seated', 'completed', 'cancelled',
]

const DOUBLE_BOOKING_MESSAGE = 'Το τραπέζι είναι ήδη κρατημένο για αυτή την ώρα'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function pinnedRestaurantId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const cookieStore = await cookies()
  const cookieId = cookieStore.get(RESTAURANT_COOKIE)?.value
  if (cookieId) {
    const { data } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', cookieId)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (data) return data.id
  }
  const { data: oldest } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return oldest?.id ?? null
}

function mapReservation(r: Tables<'reservations'>): Reservation {
  const time = typeof r.reserved_time === 'string' ? r.reserved_time.slice(0, 5) : ''
  return {
    id: r.id,
    name: r.customer_name ?? '',
    phone: r.customer_phone ?? '',
    date: r.reserved_date ?? '',
    time,
    guests: r.party_size ?? 0,
    table_id: r.table_id ?? undefined,
    status: r.status,
    notes: r.notes ?? '',
    created_at: r.created_at ?? '',
  }
}

export interface ReservationInput {
  name: string
  phone: string
  date: string
  time: string
  guests: number
  table_id?: string
  status: ReservationStatus
  notes?: string
}

type UpsertResult =
  | { success: true; reservation: Reservation }
  | { error: string }

export async function upsertReservation(
  form: ReservationInput,
  id?: string,
): Promise<UpsertResult> {
  const restaurantId = await pinnedRestaurantId()
  if (!restaurantId) return { error: 'Μη εξουσιοδοτημένος' }

  const name = form.name?.trim() ?? ''
  if (!name || name.length > 100) return { error: 'Όνομα πελάτη απαιτείται' }

  const phone = form.phone?.trim() ?? ''
  if (phone.length > 30) return { error: 'Μη έγκυρο τηλέφωνο' }

  if (!DATE_RE.test(form.date) || Number.isNaN(Date.parse(form.date))) {
    return { error: 'Μη έγκυρη ημερομηνία' }
  }
  if (!TIME_RE.test(form.time)) return { error: 'Μη έγκυρη ώρα' }

  if (!Number.isInteger(form.guests) || form.guests < 1 || form.guests > 20) {
    return { error: 'Μη έγκυρος αριθμός ατόμων' }
  }

  if (!VALID_STATUSES.includes(form.status)) {
    return { error: 'Μη έγκυρη κατάσταση' }
  }

  if (form.table_id && !UUID_RE.test(form.table_id)) {
    return { error: 'Μη έγκυρο τραπέζι' }
  }

  const notes = form.notes?.trim() ?? ''
  if (notes.length > 1000) return { error: 'Σημειώσεις πολύ μεγάλες' }

  if (id && !UUID_RE.test(id)) return { error: 'Μη έγκυρη κράτηση' }

  const supabase = await createClient()

  // If a table_id is supplied, verify it belongs to this restaurant. RLS would
  // already block cross-tenant writes, but the explicit check lets us return
  // a clean Greek error instead of a generic FK / RLS failure.
  if (form.table_id) {
    const { data: table } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('id', form.table_id)
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
    if (!table) return { error: 'Μη έγκυρο τραπέζι' }
  }

  const payload = {
    customer_name: name,
    customer_phone: phone || null,
    reserved_date: form.date,
    reserved_time: form.time,
    party_size: form.guests,
    table_id: form.table_id || null,
    status: form.status,
    notes: notes || null,
    restaurant_id: restaurantId,
  }

  const query = id
    ? supabase
        .from('reservations')
        .update(payload)
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .select()
        .single()
    : supabase.from('reservations').insert(payload).select().single()

  const { data, error } = await query
  if (error) {
    if (error.code === '23505') return { error: DOUBLE_BOOKING_MESSAGE }
    console.error('[reservations] upsert failed:', error)
    return { error: 'Σφάλμα κατά την αποθήκευση. Δοκιμάστε ξανά.' }
  }

  revalidatePath('/dashboard/reservations')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/waiter')
  return { success: true, reservation: mapReservation(data) }
}

export async function deleteReservation(id: string) {
  if (!UUID_RE.test(id)) return { error: 'Μη έγκυρη κράτηση' }

  const restaurantId = await pinnedRestaurantId()
  if (!restaurantId) return { error: 'Μη εξουσιοδοτημένος' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
  if (error) {
    console.error('[reservations] delete failed:', error)
    return { error: 'Σφάλμα κατά τη διαγραφή.' }
  }

  revalidatePath('/dashboard/reservations')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/waiter')
  return { success: true }
}

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  if (!UUID_RE.test(id)) return { error: 'Μη έγκυρη κράτηση' }
  if (!VALID_STATUSES.includes(status)) return { error: 'Μη έγκυρη κατάσταση' }

  const restaurantId = await pinnedRestaurantId()
  if (!restaurantId) return { error: 'Μη εξουσιοδοτημένος' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
  if (error) {
    if (error.code === '23505') return { error: DOUBLE_BOOKING_MESSAGE }
    console.error('[reservations] status update failed:', error)
    return { error: 'Σφάλμα κατά την ενημέρωση κράτησης.' }
  }

  revalidatePath('/dashboard/reservations')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/waiter')
  return { success: true }
}
