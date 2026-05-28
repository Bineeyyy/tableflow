'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// /dashboard and /dashboard/waiter both subscribe to restaurant_tables and
// reservations via realtime, so server revalidation after a tap rebuilds
// HTML the client never re-fetches. Realtime is the source of truth for
// floor-plan freshness; the revalidatePath('/dashboard*') calls were
// wasted server work and have been removed.

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
    // Was this an available→occupied flip (i.e. a fresh seating), or just a
    // re-entry of guest count on an already-occupied row? Only the former
    // counts as an in-room "event" for reporting. Reading status first means
    // a misclick that re-occupies an occupied table doesn't double-count.
    const { data: existing, error: readErr } = await supabase
      .from('restaurant_tables')
      .select('status')
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
    if (readErr || !existing) {
      console.error('[waiter] read table status failed:', readErr)
      return { error: 'Δεν βρέθηκε το τραπέζι' }
    }
    const wasFree = existing.status === 'available'

    // seated_at marks when the current party arrived — used by the floor
    // plan to render an "X minutes seated" indicator. Always set on occupy
    // (not just on the available→occupied flip) so re-entering the guest
    // count doesn't preserve a stale duration from the previous party.
    const { error } = await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied', current_guests: params.guests, seated_at: new Date().toISOString() })
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
    if (error) {
      console.error('[waiter] occupy table failed:', error)
      return { error: 'Σφάλμα κατά την ενημέρωση τραπεζιού.' }
    }

    // Activity ledger for reports: every fresh seating (manual occupy where
    // no reservation is involved) lands in `walkins`. Reservation seatings
    // are tracked via the reservations table itself, so we avoid logging
    // those here to prevent double-counting in the totals.
    if (wasFree) {
      const { error: walkErr } = await supabase
        .from('walkins')
        .insert({
          restaurant_id: restaurantId,
          table_id: tableId,
          party_size: params.guests,
        })
      // Don't fail the user-facing action if the ledger insert hiccups —
      // the table is already occupied. Log so we notice.
      if (walkErr) console.error('[waiter] walkin log failed:', walkErr)
    }
  } else {
    const { error } = await supabase
      .from('restaurant_tables')
      .update({ status: 'available', current_guests: 0, seated_at: null })
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
    if (error) {
      console.error('[waiter] free table failed:', error)
      return { error: 'Σφάλμα κατά την ενημέρωση τραπεζιού.' }
    }
  }

  return { success: true }
}

// Walk-in: assign the smallest available table that fits the party and flip it
// to occupied. Returns the assigned table number so the UI can show it.
// (No order is created — the orders module has been removed from the app.)
//
// The pick-then-update pair was previously a TOCTOU race: two concurrent
// walk-ins both see the same smallest-fit candidate, both UPDATE it, and
// the second silently overwrites the first party's guest count. Fix is to
// claim the row atomically with `WHERE status = 'available'` — concurrent
// callers race on the predicate; only one UPDATE matches, the other gets
// zero rows back and retries with a fresh pick. Bounded so a malicious or
// pathological loop can't keep us spinning forever.
const WALKIN_MAX_ATTEMPTS = 5
export async function createWalkin(guests: number) {
  if (guests < 1 || guests > 20) return { error: 'Μη έγκυρος αριθμός ατόμων' }

  const restaurantId = await pinnedRestaurantId()
  if (!restaurantId) return { error: 'Δεν βρέθηκε εστιατόριο' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Μη εξουσιοδοτημένος' }

  for (let attempt = 0; attempt < WALKIN_MAX_ATTEMPTS; attempt++) {
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

    // Atomic claim — predicate `status = 'available'` is evaluated by
    // postgres at update time, so a concurrent claim that already flipped
    // the row to 'occupied' makes this UPDATE match zero rows. We detect
    // that via the empty .select() result and retry with the next pick.
    const { data: claimed, error: claimErr } = await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied', current_guests: guests, seated_at: new Date().toISOString() })
      .eq('id', candidate.id)
      .eq('restaurant_id', restaurantId)
      .eq('status', 'available')
      .select('id, number')

    if (claimErr) {
      console.error('[waiter] mark occupied failed:', claimErr)
      return { error: 'Σφάλμα κατά την ενημέρωση τραπεζιού.' }
    }
    if (claimed && claimed.length > 0) {
      // Log to walkins so reports can count this party in totals/occupancy
      // alongside reservations. Failure here doesn't unwind the seating —
      // the table is already claimed and the user has moved on.
      const { error: walkErr } = await supabase
        .from('walkins')
        .insert({
          restaurant_id: restaurantId,
          table_id: candidate.id,
          party_size: guests,
        })
      if (walkErr) console.error('[waiter] walkin log failed:', walkErr)
      return { success: true, tableNumber: candidate.number }
    }
    // Lost the race on this candidate — loop to pick the next-best fit.
  }

  // Either every candidate kept getting claimed out from under us (very
  // contended) or nothing fits. Surface the same Greek message the no-fit
  // path uses so the modal renders consistently.
  return { error: 'Δεν υπάρχει διαθέσιμο τραπέζι αυτής της χωρητικότητας' }
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
    .update({ status: 'occupied', current_guests: reservation.party_size, seated_at: new Date().toISOString() })
    .eq('id', resolvedTableId)
    .eq('restaurant_id', restaurantId)
  if (tblErr) {
    console.error('[waiter] seat reservation table failed:', tblErr)
    return { error: 'Σφάλμα κατά την ενημέρωση τραπεζιού.' }
  }

  return { success: true }
}
