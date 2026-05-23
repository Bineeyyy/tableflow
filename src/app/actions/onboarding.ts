'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const RESTAURANT_COOKIE = 'tf_restaurant_id'

export async function createRestaurant(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const name = ((formData.get('name') as string | null) ?? '').trim()
  const address = ((formData.get('address') as string | null) ?? '').trim()
  const phone = ((formData.get('phone') as string | null) ?? '').trim()
  // numTables previously silently clamped to [1, 50] — a user who typed 100
  // got 50 created and assumed the form was buggy. Validate explicitly: empty
  // falls back to the in-form default of 4, anything else must parse and be
  // in range or we return a clear Greek error so the user can correct it.
  const rawNumTables = (formData.get('numTables') as string | null)?.trim() ?? ''
  let numTables: number
  if (rawNumTables === '') {
    numTables = 4
  } else {
    const parsed = parseInt(rawNumTables, 10)
    if (!Number.isFinite(parsed)) {
      return { error: 'Ο αριθμός τραπεζιών δεν είναι έγκυρος' }
    }
    if (parsed < 1 || parsed > 50) {
      return { error: 'Ο αριθμός τραπεζιών πρέπει να είναι μεταξύ 1 και 50' }
    }
    numTables = parsed
  }

  // Length caps are server-side defence-in-depth — the form already restricts
  // most of these, but the action is callable directly via fetch.
  if (!name) return { error: 'Το όνομα εστιατορίου είναι υποχρεωτικό' }
  if (name.length > 120) return { error: 'Το όνομα είναι πολύ μεγάλο' }
  if (address.length > 240) return { error: 'Η διεύθυνση είναι πολύ μεγάλη' }
  if (phone && !/^[+0-9\s().-]{4,32}$/.test(phone)) {
    return { error: 'Μη έγκυρος αριθμός τηλεφώνου' }
  }

  // Generate UUID upfront so we can avoid RETURNING (which hits SELECT RLS before
  // the user is in restaurant_members — has_restaurant_access would return false).
  const restaurantId = crypto.randomUUID()

  // 7-day free trial starts the moment the restaurant is created. The DB
  // column also has a default, but we set it explicitly here so the value
  // is deterministic and easy to surface in logs.
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: restError } = await supabase
    .from('restaurants')
    .insert({
      id: restaurantId,
      name,
      address: address || null,
      phone: phone || null,
      owner_id: user.id,
      trial_ends_at: trialEndsAt,
    })

  if (restError) {
    return { error: 'Σφάλμα κατά τη δημιουργία εστιατορίου. Δοκιμάστε ξανά.' }
  }

  // The owner_membership row is inserted by the on_restaurant_created
  // trigger (handle_restaurant_created — SECURITY DEFINER, with ON CONFLICT
  // DO NOTHING), so the user is already a member by the time we get here.
  // We used to insert that row again from the action and it consistently
  // duplicate-keyed against the trigger's row — failing onboarding mid-flight
  // and leaving restaurants with no tables seeded. Don't do that.

  // Seed default tables in a simple grid layout (5 columns). All new tables
  // start at 4 seats / square shape — owner edits capacity per-table later.
  const COLS = 5
  const tables = Array.from({ length: numTables }, (_, i) => ({
    restaurant_id: restaurantId,
    number: i + 1,
    seats: 4,
    shape: 'square' as const,
    status: 'available' as const,
    pos_x: 80 + (i % COLS) * 140,
    pos_y: 80 + Math.floor(i / COLS) * 140,
  }))

  const { error: tablesError } = await supabase.from('restaurant_tables').insert(tables)
  if (tablesError) {
    return { error: 'Σφάλμα κατά τη δημιουργία τραπεζιών. Δοκιμάστε ξανά.' }
  }

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
