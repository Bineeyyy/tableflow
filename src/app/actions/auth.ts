'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const RESTAURANT_COOKIE = 'tf_restaurant_id'

export async function login(_: unknown, formData: FormData) {
  const rememberMe = formData.get('rememberMe') === 'on'
  const supabase = await createClient(rememberMe ? 30 : 0)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }

  // Cache restaurant ID in a cookie for the proxy's optimistic check
  if (data.user) {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', data.user.id)
      .limit(1)
      .maybeSingle()

    if (restaurant) {
      const cookieStore = await cookies()
      cookieStore.set(RESTAURANT_COOKIE, restaurant.id, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 } : {}),
      })
    }
  }

  redirect('/dashboard')
}

export async function register(_: unknown, formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  if (password !== confirmPassword) {
    return { error: 'Οι κωδικοί δεν ταιριάζουν' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password,
    options: {
      data: { full_name: formData.get('name') as string },
    },
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(RESTAURANT_COOKIE)
  redirect('/auth/login')
}
