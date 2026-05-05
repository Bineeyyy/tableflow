'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

const RESTAURANT_COOKIE = 'tf_restaurant_id'

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
    const toInsert = Array.from({ length: newCount - currentCount }, (_, i) => {
      const idx = currentCount + i
      return {
        restaurant_id: restaurantId,
        number: startNumber + i,
        seats: idx % 3 === 2 ? 6 : 4,
        shape: (idx % 2 === 0 ? 'round' : 'square') as 'round' | 'square',
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
