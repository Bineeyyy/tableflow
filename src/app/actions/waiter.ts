'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

const RESTAURANT_COOKIE = 'tf_restaurant_id'

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

// Tap-to-flip table status. Mark a free table as occupied with N guests, or
// mark an occupied table as free (resets current_guests to 0). The waiter
// floor calls this on every tap, so it must be cheap and not require any
// confirmation step.
export async function setTableOccupancy(tableId: string, params:
  | { occupied: true; guests: number }
  | { occupied: false }
) {
  // Defence in depth: scope the update to the user's pinned restaurant rather
  // than relying on RLS alone. Lets us return a clean error if a stale tableId
  // from a switched-account session leaks into the request, instead of letting
  // the update silently no-op via RLS.
  const restaurantId = await pinnedRestaurantId()
  if (!restaurantId) return { error: 'Μη εξουσιοδοτημένος' }
  if (typeof tableId !== 'string' || tableId.length === 0 || tableId.length > 64) {
    return { error: 'Μη έγκυρο τραπέζι' }
  }

  const supabase = await createClient()

  if (params.occupied) {
    if (!Number.isInteger(params.guests) || params.guests < 1 || params.guests > 20) {
      return { error: 'Μη έγκυρος αριθμός ατόμων' }
    }
    const { error } = await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied', current_guests: params.guests })
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
    if (error) {
      console.error('[waiter] occupy table failed:', error)
      return { error: 'Σφάλμα κατά την ενημέρωση τραπεζιού.' }
    }
  } else {
    const { error } = await supabase
      .from('restaurant_tables')
      .update({ status: 'available', current_guests: 0 })
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
    if (error) {
      console.error('[waiter] free table failed:', error)
      return { error: 'Σφάλμα κατά την ενημέρωση τραπεζιού.' }
    }
  }

  revalidatePath('/dashboard/waiter')
  revalidatePath('/dashboard')
  return { success: true }
}

// Walk-in: assign the smallest available table that fits the party and flip it
// to occupied. Returns the assigned table number so the UI can show it.
// (No order is created — the orders module has been removed from the app.)
export async function createWalkin(guests: number) {
  if (guests < 1 || guests > 20) return { error: 'Μη έγκυρος αριθμός ατόμων' }

  const restaurantId = await pinnedRestaurantId()
  if (!restaurantId) return { error: 'Δεν βρέθηκε εστιατόριο' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Μη εξουσιοδοτημένος' }

  // Smallest available table that fits the party — keeps small tables for
  // small groups when possible.
  const { data: candidate, error: pickErr } = await supabase
    .from('restaurant_tables')
    .select('id, number, seats')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'available')
    .gte('seats', guests)
    .order('seats', { ascending: true })
    .order('number', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (pickErr) {
    console.error('[waiter] pick table failed:', pickErr)
    return { error: 'Σφάλμα κατά την επιλογή τραπεζιού.' }
  }
  if (!candidate) return { error: 'Δεν υπάρχει διαθέσιμο τραπέζι αυτής της χωρητικότητας' }

  const { error: statusErr } = await supabase
    .from('restaurant_tables')
    .update({ status: 'occupied', current_guests: guests })
    .eq('id', candidate.id)
    .eq('restaurant_id', restaurantId)
  if (statusErr) {
    console.error('[waiter] mark occupied failed:', statusErr)
    return { error: 'Σφάλμα κατά την ενημέρωση τραπεζιού.' }
  }

  revalidatePath('/dashboard/waiter')
  revalidatePath('/dashboard')
  return { success: true, tableNumber: candidate.number }
}

// Mark a reservation as seated — sets the reservation status and flips the
// linked table to occupied. If the reservation doesn't have a pre-assigned
// table, the caller should pass one.
export async function seatReservation(reservationId: string, tableId?: string) {
  const restaurantId = await pinnedRestaurantId()
  if (!restaurantId) return { error: 'Δεν βρέθηκε εστιατόριο' }

  const supabase = await createClient()
  const { data: reservation, error: rErr } = await supabase
    .from('reservations')
    .select('id, table_id, party_size, restaurant_id, reserved_date, reserved_time')
    .eq('id', reservationId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle()
  if (rErr || !reservation) return { error: 'Δεν βρέθηκε η κράτηση' }

  let resolvedTableId = tableId ?? reservation.table_id ?? null
  if (!resolvedTableId) {
    const { data: candidate } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'available')
      .gte('seats', reservation.party_size)
      .order('seats', { ascending: true })
      .limit(1)
      .maybeSingle()
    resolvedTableId = candidate?.id ?? null
  }
  if (!resolvedTableId) return { error: 'Κανένα διαθέσιμο τραπέζι' }

  // Pre-flight slot check: refuse to seat if another non-terminal reservation
  // already holds (table, date, time). Mirrors the partial unique index on
  // reservations so the user gets a clean Greek message instead of a generic
  // "update failed" when the index would have rejected the UPDATE.
  const { data: clash } = await supabase
    .from('reservations')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('table_id', resolvedTableId)
    .eq('reserved_date', reservation.reserved_date)
    .eq('reserved_time', reservation.reserved_time)
    .not('status', 'in', '(cancelled,completed)')
    .neq('id', reservationId)
    .limit(1)
    .maybeSingle()
  if (clash) return { error: 'Το τραπέζι είναι ήδη κρατημένο για αυτή την ώρα' }

  const { error: updErr } = await supabase
    .from('reservations')
    .update({ status: 'seated', table_id: resolvedTableId })
    .eq('id', reservationId)
    .eq('restaurant_id', restaurantId)
  if (updErr) {
    if (updErr.code === '23505') {
      return { error: 'Το τραπέζι είναι ήδη κρατημένο για αυτή την ώρα' }
    }
    console.error('[waiter] seat reservation update failed:', updErr)
    return { error: 'Σφάλμα κατά την ενημέρωση κράτησης.' }
  }

  const { error: tblErr } = await supabase
    .from('restaurant_tables')
    .update({ status: 'occupied', current_guests: reservation.party_size })
    .eq('id', resolvedTableId)
    .eq('restaurant_id', restaurantId)
  if (tblErr) {
    console.error('[waiter] seat reservation table failed:', tblErr)
    return { error: 'Σφάλμα κατά την ενημέρωση τραπεζιού.' }
  }

  revalidatePath('/dashboard/waiter')
  revalidatePath('/dashboard')
  return { success: true }
}
