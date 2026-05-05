'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!restaurant) return { error: 'Δεν βρέθηκε εστιατόριο' }

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
