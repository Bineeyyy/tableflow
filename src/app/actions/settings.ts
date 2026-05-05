'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

const RESTAURANT_COOKIE = 'tf_restaurant_id'

const VALID_SHAPES = ['round', 'square', 'rectangle'] as const
type Shape = typeof VALID_SHAPES[number]

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

type DayHours = { open: boolean; from: string; to: string }

export async function saveRestaurantSettings(data: {
  name: string
  address: string
  phone: string
  email: string
  capacity: number
  hours: DayHours[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Μη εξουσιοδοτημένος' }

  // Pin the operation to the cookie's restaurant when present, so a user with
  // multiple restaurants edits the same one the dashboard is showing. Fall back
  // to the oldest owned restaurant otherwise.
  const cookieStore = await cookies()
  const cookieId = cookieStore.get(RESTAURANT_COOKIE)?.value

  let restaurantId: string | null = null
  if (cookieId) {
    const { data: byCookie, error: cookieErr } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', cookieId)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (cookieErr) console.error('[settings] cookie restaurant lookup failed:', cookieErr)
    if (byCookie) restaurantId = byCookie.id
  }
  if (!restaurantId) {
    const { data: oldest, error: oldestErr } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (oldestErr) console.error('[settings] oldest restaurant lookup failed:', oldestErr)
    restaurantId = oldest?.id ?? null
  }

  if (!restaurantId) return { error: 'Δεν βρέθηκε εστιατόριο' }

  const { error: updateError } = await supabase
    .from('restaurants')
    .update({
      name: data.name.trim(),
      address: data.address.trim() || null,
      phone: data.phone.trim() || null,
      email: data.email.trim() || null,
      operating_hours: data.hours,
    })
    .eq('id', restaurantId)

  if (updateError) {
    console.error('[settings] restaurant update failed:', updateError)
    return { error: `Σφάλμα αποθήκευσης: ${updateError.message}` }
  }

  // Sync restaurant_tables to match requested capacity.
  // Read current rows ordered by number — we delete the highest-numbered ones
  // when shrinking, append after the last when growing.
  const { data: currentTables, error: selectError } = await supabase
    .from('restaurant_tables')
    .select('id, number')
    .eq('restaurant_id', restaurantId)
    .order('number', { ascending: true })

  if (selectError) {
    console.error('[settings] read tables failed:', selectError)
    return { error: `Σφάλμα ανάγνωσης τραπεζιών: ${selectError.message}` }
  }

  const rows = currentTables ?? []
  const currentCount = rows.length
  const newCount = Math.min(200, Math.max(1, data.capacity))

  if (newCount > currentCount) {
    const COLS = 5
    const startNumber = (rows[rows.length - 1]?.number ?? 0) + 1
    // New tables default to 4 seats and a square shape — owner edits each
    // table's capacity/shape individually afterwards. We deliberately do NOT
    // touch existing tables' seats here (this branch only fires when growing
    // the table count; shrinking only deletes the highest-numbered rows).
    const toInsert = Array.from({ length: newCount - currentCount }, (_, i) => {
      const idx = currentCount + i
      return {
        restaurant_id: restaurantId,
        number: startNumber + i,
        seats: 4,
        shape: 'square' as const,
        status: 'available' as const,
        pos_x: 80 + (idx % COLS) * 140,
        pos_y: 80 + Math.floor(idx / COLS) * 140,
      }
    })
    // .select() so we get the inserted rows back; if RLS or constraints block,
    // this returns an error or an empty array we can detect.
    const { data: inserted, error: insertError } = await supabase
      .from('restaurant_tables')
      .insert(toInsert)
      .select('id')

    if (insertError) {
      console.error('[settings] insert tables failed:', insertError)
      return { error: `Σφάλμα προσθήκης τραπεζιών: ${insertError.message}` }
    }
    if (!inserted || inserted.length !== toInsert.length) {
      console.error('[settings] insert returned wrong count', { expected: toInsert.length, got: inserted?.length })
      return { error: 'Η προσθήκη τραπεζιών δεν ολοκληρώθηκε (RLS;)' }
    }
  } else if (newCount < currentCount) {
    const toDelete = rows.slice(newCount).map(t => t.id)
    // .select() so we can verify the delete actually removed rows.
    const { data: deleted, error: deleteError } = await supabase
      .from('restaurant_tables')
      .delete()
      .in('id', toDelete)
      .select('id')

    if (deleteError) {
      console.error('[settings] delete tables failed:', deleteError)
      return { error: `Σφάλμα διαγραφής τραπεζιών: ${deleteError.message}` }
    }
    if (!deleted || deleted.length !== toDelete.length) {
      console.error('[settings] delete removed wrong count', {
        expected: toDelete.length, got: deleted?.length, restaurantId,
      })
      return { error: 'Η διαγραφή τραπεζιών δεν ολοκληρώθηκε (RLS;)' }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')

  return { success: true, restaurantId, tableCount: newCount }
}

export type TableEdit = {
  id: string
  number: number
  label: string
  seats: number
  shape: Shape
  zone: string
}

// Persists per-table edits made on the settings "Τραπέζια" tab. Validates the
// payload before touching the DB so a typo in one row doesn't half-apply: we
// reject the whole batch and the form keeps the user's input.
export async function updateTables(payload: TableEdit[]) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { error: 'Δεν υπάρχουν τραπέζια προς αποθήκευση' }
  }

  const restaurantId = await pinnedRestaurantId()
  if (!restaurantId) return { error: 'Δεν βρέθηκε εστιατόριο' }

  const seenNumbers = new Set<number>()
  for (const t of payload) {
    if (!t.id) return { error: 'Λείπει το id τραπεζιού' }
    if (!Number.isInteger(t.number) || t.number < 1 || t.number > 999) {
      return { error: `Μη έγκυρος αριθμός τραπεζιού: ${t.number}` }
    }
    if (seenNumbers.has(t.number)) {
      return { error: `Διπλός αριθμός τραπεζιού: ${t.number}` }
    }
    seenNumbers.add(t.number)
    if (!Number.isInteger(t.seats) || t.seats < 1 || t.seats > 20) {
      return { error: `Μη έγκυρες θέσεις στο τραπέζι ${t.number} (1–20)` }
    }
    if (!VALID_SHAPES.includes(t.shape)) {
      return { error: `Μη έγκυρο σχήμα στο τραπέζι ${t.number}` }
    }
  }

  const supabase = await createClient()

  // Verify the user actually owns every row they're trying to edit, and that
  // shrinking seats won't violate the (current_guests <= seats) check
  // constraint on an occupied table.
  const ids = payload.map(t => t.id)
  const { data: existing, error: readErr } = await supabase
    .from('restaurant_tables')
    .select('id, seats, current_guests, number')
    .eq('restaurant_id', restaurantId)
    .in('id', ids)
  if (readErr) {
    console.error('[settings] read tables for update failed:', readErr)
    return { error: `Σφάλμα ανάγνωσης: ${readErr.message}` }
  }
  if (!existing || existing.length !== payload.length) {
    return { error: 'Κάποιο τραπέζι δεν ανήκει στο εστιατόριο σας' }
  }
  const byId = new Map(existing.map(r => [r.id, r]))

  for (const t of payload) {
    const row = byId.get(t.id)
    if (!row) return { error: 'Κάποιο τραπέζι δεν βρέθηκε' }
    if (t.seats < row.current_guests) {
      return {
        error: `Το τραπέζι ${row.number} έχει ${row.current_guests} άτομα — μειώστε πρώτα τους πελάτες πριν αλλάξετε χωρητικότητα.`,
      }
    }
  }

  // Apply each row. We loop instead of using upsert() because we want to scope
  // each update by restaurant_id (defense-in-depth alongside RLS).
  for (const t of payload) {
    const { error } = await supabase
      .from('restaurant_tables')
      .update({
        number: t.number,
        label: t.label.trim() || null,
        seats: t.seats,
        shape: t.shape,
        zone: t.zone.trim() || null,
      })
      .eq('id', t.id)
      .eq('restaurant_id', restaurantId)
    if (error) {
      console.error(`[settings] update table ${t.id} failed:`, error)
      return { error: `Σφάλμα ενημέρωσης τραπεζιού ${t.number}: ${error.message}` }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { success: true }
}
