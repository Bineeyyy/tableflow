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
  // to the oldest owned restaurant otherwise. Never use .maybeSingle() across
  // an unfiltered owner_id query — it errors when more than one row exists.
  const cookieStore = await cookies()
  const cookieId = cookieStore.get(RESTAURANT_COOKIE)?.value

  let restaurantId: string | null = null
  if (cookieId) {
    const { data: byCookie } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', cookieId)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (byCookie) restaurantId = byCookie.id
  }
  if (!restaurantId) {
    const { data: oldest } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    restaurantId = oldest?.id ?? null
  }

  if (!restaurantId) return { error: 'Δεν βρέθηκε εστιατόριο' }
  const restaurant = { id: restaurantId }

  const { error: updateError } = await supabase
    .from('restaurants')
    .update({
      name: data.name.trim(),
      address: data.address.trim() || null,
      phone: data.phone.trim() || null,
      email: data.email.trim() || null,
      operating_hours: data.hours,
    })
    .eq('id', restaurant.id)

  if (updateError) return { error: 'Σφάλμα αποθήκευσης στοιχείων εστιατορίου' }

  // Sync restaurant_tables to match the requested capacity
  const { data: currentTables } = await supabase
    .from('restaurant_tables')
    .select('id, number')
    .eq('restaurant_id', restaurant.id)
    .order('number')

  const currentCount = currentTables?.length ?? 0
  const newCount = Math.min(200, Math.max(1, data.capacity))

  if (newCount > currentCount) {
    const COLS = 5
    const toInsert = Array.from({ length: newCount - currentCount }, (_, i) => {
      const idx = currentCount + i
      return {
        restaurant_id: restaurant.id,
        number: idx + 1,
        seats: idx % 3 === 2 ? 6 : 4,
        shape: (idx % 2 === 0 ? 'round' : 'square') as 'round' | 'square',
        status: 'available' as const,
        pos_x: 80 + (idx % COLS) * 140,
        pos_y: 80 + Math.floor(idx / COLS) * 140,
      }
    })
    const { error: insertError } = await supabase.from('restaurant_tables').insert(toInsert)
    if (insertError) return { error: 'Σφάλμα προσθήκης τραπεζιών' }
  } else if (newCount < currentCount) {
    const toDelete = currentTables!.slice(newCount).map(t => t.id)
    const { error: deleteError } = await supabase.from('restaurant_tables').delete().in('id', toDelete)
    if (deleteError) return { error: 'Σφάλμα διαγραφής τραπεζιών' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')

  return { success: true }
}
