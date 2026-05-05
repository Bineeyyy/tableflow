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
  const supabase = await createClient()

  if (params.occupied) {
    if (params.guests < 1 || params.guests > 20) return { error: 'Μη έγκυρος αριθμός ατόμων' }
    const { error } = await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied', current_guests: params.guests })
      .eq('id', tableId)
    if (error) {
      console.error('[waiter] occupy table failed:', error)
      return { error: `Σφάλμα: ${error.message}` }
    }
  } else {
    const { error } = await supabase
      .from('restaurant_tables')
      .update({ status: 'available', current_guests: 0 })
      .eq('id', tableId)
    if (error) {
      console.error('[waiter] free table failed:', error)
      return { error: `Σφάλμα: ${error.message}` }
    }
  }

  revalidatePath('/dashboard/waiter')
  revalidatePath('/dashboard')
  return { success: true }
}

// Walk-in: assign the first available table that fits the party size and open
// an order on it. Returns the assigned table number so the UI can show it.
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
    return { error: `Σφάλμα: ${pickErr.message}` }
  }
  if (!candidate) return { error: 'Δεν υπάρχει διαθέσιμο τραπέζι αυτής της χωρητικότητας' }

  const { error: orderErr } = await supabase.from('orders').insert({
    restaurant_id: restaurantId,
    table_id: candidate.id,
    status: 'open',
    guests,
    created_by: user.id,
  })
  if (orderErr) {
    console.error('[waiter] open order failed:', orderErr)
    return { error: `Σφάλμα παραγγελίας: ${orderErr.message}` }
  }

  const { error: statusErr } = await supabase
    .from('restaurant_tables')
    .update({ status: 'occupied', current_guests: guests })
    .eq('id', candidate.id)
  if (statusErr) {
    console.error('[waiter] mark occupied failed:', statusErr)
    return { error: `Σφάλμα: ${statusErr.message}` }
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
    .select('id, table_id, party_size, restaurant_id')
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

  const { error: updErr } = await supabase
    .from('reservations')
    .update({ status: 'seated', table_id: resolvedTableId })
    .eq('id', reservationId)
  if (updErr) {
    console.error('[waiter] seat reservation update failed:', updErr)
    return { error: `Σφάλμα: ${updErr.message}` }
  }

  const { error: tblErr } = await supabase
    .from('restaurant_tables')
    .update({ status: 'occupied', current_guests: reservation.party_size })
    .eq('id', resolvedTableId)
  if (tblErr) {
    console.error('[waiter] seat reservation table failed:', tblErr)
    return { error: `Σφάλμα: ${tblErr.message}` }
  }

  revalidatePath('/dashboard/waiter')
  revalidatePath('/dashboard')
  return { success: true }
}
