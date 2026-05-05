'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const RESTAURANT_COOKIE = 'tf_restaurant_id'

async function cacheRestaurantCookie(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  rememberMe: boolean,
) {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle()

  if (restaurant) {
    const cookieStore = await cookies()
    cookieStore.set(RESTAURANT_COOKIE, restaurant.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      ...(rememberMe ? { maxAge: 3650 * 24 * 60 * 60 } : {}),
    })
  }
}

export async function login(_: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const rememberMe = formData.get('rememberMe') === 'on'

  // Admin bypass: skip password for the owner account.
  // Requires both ADMIN_EMAIL and SUPABASE_SERVICE_ROLE_KEY to be set in Vercel.
  // If either is missing, falls through to normal login.
  if (
    process.env.ADMIN_EMAIL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    email === process.env.ADMIN_EMAIL
  ) {
    try {
      const admin = createAdminClient()
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      })
      if (linkError || !linkData?.properties) return { error: linkError?.message ?? 'Admin login failed' }

      const supabase = await createClient(rememberMe ? 3650 : 0)
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: linkData.properties.email_otp,
        type: 'magiclink',
      })
      if (error) return { error: error.message }
      if (data.user) await cacheRestaurantCookie(data.user.id, supabase, rememberMe)
    } catch {
      return { error: 'Παρουσιάστηκε σφάλμα κατά τη σύνδεση.' }
    }
    redirect('/dashboard')
  }

  // Normal login flow
  try {
    const supabase = await createClient(rememberMe ? 3650 : 0)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: formData.get('password') as string,
    })
    if (error) return { error: error.message }
    if (data.user) await cacheRestaurantCookie(data.user.id, supabase, rememberMe)
  } catch {
    return { error: 'Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά.' }
  }
  redirect('/dashboard')
}

export async function register(_: unknown, formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  if (password !== confirmPassword) {
    return { error: 'Οι κωδικοί δεν ταιριάζουν' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
      email: formData.get('email') as string,
      password,
      options: {
        data: { full_name: formData.get('name') as string },
      },
    })
    if (error) return { error: error.message }
  } catch {
    return { error: 'Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά.' }
  }
  // redirect() throws NEXT_REDIRECT — must be outside try/catch
  redirect('/dashboard')
}

export async function forgotPassword(_: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://tableflow-sigma.vercel.app/auth/reset-password',
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(RESTAURANT_COOKIE)
  redirect('/auth/login')
}
