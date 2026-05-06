'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

const RESTAURANT_COOKIE = 'tf_restaurant_id'

type CategorySlug = Database['public']['Enums']['menu_category_slug']
const VALID_SLUGS: readonly CategorySlug[] = [
  'starters', 'mains', 'salads', 'desserts', 'drinks',
] as const

// Default category labels in Greek — match the labels used on the menu page.
const DEFAULT_CATEGORIES: { slug: CategorySlug; name: string; sort_order: number }[] = [
  { slug: 'starters', name: 'Ορεκτικά', sort_order: 1 },
  { slug: 'mains',    name: 'Κυρίως',   sort_order: 2 },
  { slug: 'salads',   name: 'Σαλάτες',  sort_order: 3 },
  { slug: 'desserts', name: 'Γλυκά',    sort_order: 4 },
  { slug: 'drinks',   name: 'Ποτά',     sort_order: 5 },
]

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

// Lazy-seed the five canonical categories so users who onboarded before menu
// CRUD existed still get a workable starting point. Idempotent — only inserts
// slugs that aren't already present.
export async function ensureMenuCategories(restaurantId: string): Promise<void> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('menu_categories')
    .select('slug')
    .eq('restaurant_id', restaurantId)

  const have = new Set((existing ?? []).map(r => r.slug))
  const missing = DEFAULT_CATEGORIES.filter(c => !have.has(c.slug))
  if (missing.length === 0) return

  const { error } = await supabase
    .from('menu_categories')
    .insert(
      missing.map(c => ({
        restaurant_id: restaurantId,
        slug: c.slug,
        name: c.name,
        sort_order: c.sort_order,
      })),
    )
  if (error) console.error('[menu] seed categories failed:', error)
}

type ItemInput = {
  name: string
  slug: CategorySlug
  description: string
  price: number
  available: boolean
}

function validateItemInput(input: ItemInput): string | null {
  if (!input.name.trim()) return 'Το όνομα είναι υποχρεωτικό'
  if (!VALID_SLUGS.includes(input.slug)) return 'Μη έγκυρη κατηγορία'
  if (!Number.isFinite(input.price) || input.price < 0) return 'Μη έγκυρη τιμή'
  return null
}

async function categoryIdForSlug(restaurantId: string, slug: CategorySlug): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('menu_categories')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('slug', slug)
    .maybeSingle()
  return data?.id ?? null
}

export async function createMenuItem(input: ItemInput) {
  const restaurantId = await pinnedRestaurantId()
  if (!restaurantId) return { error: 'Δεν βρέθηκε εστιατόριο' }

  const validation = validateItemInput(input)
  if (validation) return { error: validation }

  // Make sure the category row exists before inserting the item — protects new
  // users whose onboarding pre-dates the seed.
  await ensureMenuCategories(restaurantId)
  const categoryId = await categoryIdForSlug(restaurantId, input.slug)
  if (!categoryId) return { error: 'Η κατηγορία δεν υπάρχει' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      restaurant_id: restaurantId,
      category_id: categoryId,
      name: input.name.trim(),
      description: input.description.trim() || null,
      price: input.price,
      available: input.available,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[menu] create item failed:', error)
    return { error: error.message }
  }
  revalidatePath('/dashboard/menu')
  return { success: true, item: data }
}

export async function updateMenuItem(id: string, input: ItemInput) {
  const restaurantId = await pinnedRestaurantId()
  if (!restaurantId) return { error: 'Δεν βρέθηκε εστιατόριο' }

  const validation = validateItemInput(input)
  if (validation) return { error: validation }

  const categoryId = await categoryIdForSlug(restaurantId, input.slug)
  if (!categoryId) return { error: 'Η κατηγορία δεν υπάρχει' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .update({
      category_id: categoryId,
      name: input.name.trim(),
      description: input.description.trim() || null,
      price: input.price,
      available: input.available,
    })
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select('*')
    .single()

  if (error) {
    console.error('[menu] update item failed:', error)
    return { error: error.message }
  }
  revalidatePath('/dashboard/menu')
  return { success: true, item: data }
}

export async function deleteMenuItem(id: string) {
  const restaurantId = await pinnedRestaurantId()
  if (!restaurantId) return { error: 'Δεν βρέθηκε εστιατόριο' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurantId)

  if (error) {
    console.error('[menu] delete item failed:', error)
    return { error: error.message }
  }
  revalidatePath('/dashboard/menu')
  return { success: true }
}

export async function setMenuItemAvailable(id: string, available: boolean) {
  const restaurantId = await pinnedRestaurantId()
  if (!restaurantId) return { error: 'Δεν βρέθηκε εστιατόριο' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('menu_items')
    .update({ available })
    .eq('id', id)
    .eq('restaurant_id', restaurantId)

  if (error) {
    console.error('[menu] toggle availability failed:', error)
    return { error: error.message }
  }
  revalidatePath('/dashboard/menu')
  return { success: true }
}
