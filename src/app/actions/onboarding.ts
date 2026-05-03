'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const RESTAURANT_COOKIE = 'tf_restaurant_id'

export async function createRestaurant(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const name = (formData.get('name') as string).trim()
  const address = (formData.get('address') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const numTables = Math.min(50, Math.max(1, parseInt(formData.get('numTables') as string) || 4))

  if (!name) return { error: 'Το όνομα εστιατορίου είναι υποχρεωτικό' }

  // Generate UUID upfront so we can avoid RETURNING (which hits SELECT RLS before
  // the user is in restaurant_members — has_restaurant_access would return false).
  const restaurantId = crypto.randomUUID()

  const { error: restError } = await supabase
    .from('restaurants')
    .insert({
      id: restaurantId,
      name,
      address: address || null,
      phone: phone || null,
      owner_id: user.id,
    })

  if (restError) {
    return { error: 'Σφάλμα κατά τη δημιουργία εστιατορίου. Δοκιμάστε ξανά.' }
  }

  // Add owner to restaurant_members — required for has_restaurant_access() and
  // for the restaurant_tables INSERT policy (tables: insert if member).
  const { error: memberError } = await supabase
    .from('restaurant_members')
    .insert({ restaurant_id: restaurantId, user_id: user.id, role: 'owner' })

  if (memberError) {
    return { error: 'Σφάλμα κατά τη ρύθμιση δικαιωμάτων. Δοκιμάστε ξανά.' }
  }

  // Seed default tables in a simple grid layout (5 columns)
  const COLS = 5
  const tables = Array.from({ length: numTables }, (_, i) => ({
    restaurant_id: restaurantId,
    number: i + 1,
    seats: i % 3 === 2 ? 6 : 4,
    shape: (i % 2 === 0 ? 'round' : 'square') as 'round' | 'square',
    status: 'available' as const,
    pos_x: 80 + (i % COLS) * 140,
    pos_y: 80 + Math.floor(i / COLS) * 140,
  }))

  await supabase.from('restaurant_tables').insert(tables)

  // Cache restaurant ID for the proxy's optimistic check
  const cookieStore = await cookies()
  cookieStore.set(RESTAURANT_COOKIE, restaurantId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
  })

  redirect('/dashboard')
}
