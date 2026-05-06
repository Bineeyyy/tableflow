'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const RESTAURANT_COOKIE = 'tf_restaurant_id'

// Generic copy used for any failed-login path. We deliberately avoid leaking
// whether the email exists or what specifically went wrong — those have all
// been used historically for account enumeration and targeted brute force.
const GENERIC_AUTH_ERROR = 'Λάθος email ή κωδικός.'

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
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''
  const rememberMe = formData.get('rememberMe') === 'on'

  if (!email || !password) return { error: GENERIC_AUTH_ERROR }

  // Normal login flow — always password-checked. The previous
  // `email === ADMIN_EMAIL` bypass let anyone who knew the admin's address sign
  // in with no password; that backdoor has been removed. Admin promotion is now
  // a property of the database row, not the login flow.
  try {
    const supabase = await createClient(rememberMe ? 3650 : 0)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return { error: GENERIC_AUTH_ERROR }
    await cacheRestaurantCookie(data.user.id, supabase, rememberMe)
  } catch {
    return { error: GENERIC_AUTH_ERROR }
  }
  redirect('/dashboard')
}

export async function register(_: unknown, formData: FormData) {
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string | null) ?? ''
  const name = ((formData.get('name') as string | null) ?? '').trim()

  if (!email || !password || !name) return { error: 'Συμπληρώστε όλα τα πεδία.' }
  if (password.length < 6) return { error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.' }
  if (password !== confirmPassword) return { error: 'Οι κωδικοί δεν ταιριάζουν.' }
  if (name.length > 120) return { error: 'Πολύ μεγάλο όνομα.' }
  if (email.length > 254) return { error: 'Πολύ μεγάλη διεύθυνση email.' }

  try {
    const supabase = await createClient()

    // Supabase email confirmation is on for this project, so a public signUp
    // would (a) trigger a confirmation email subject to the project's tight
    // email-send rate limit and (b) leave the user unconfirmed — making the
    // immediate signInWithPassword fail with the generic "Invalid login
    // credentials" error. Use the service-role admin endpoint to create the
    // user already-confirmed, sidestepping both problems in a single call.
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient()
      const { error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      })
      // We surface a neutral generic message rather than Supabase's exact
      // "User already registered" so this endpoint can't be used as an email
      // enumeration oracle.
      if (createError) return { error: 'Δεν μπορέσαμε να δημιουργήσουμε λογαριασμό. Δοκιμάστε ξανά.' }
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (signUpError) return { error: 'Δεν μπορέσαμε να δημιουργήσουμε λογαριασμό. Δοκιμάστε ξανά.' }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) return { error: GENERIC_AUTH_ERROR }
  } catch {
    return { error: 'Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά.' }
  }
  // redirect() throws NEXT_REDIRECT — must be outside try/catch
  redirect('/dashboard')
}

type ForgotPasswordState = { success?: boolean; error?: string }

export async function forgotPassword(_: unknown, formData: FormData): Promise<ForgotPasswordState> {
  const email = ((formData.get('email') as string | null) ?? '').trim()
  if (!email || email.length > 254) {
    // Same shape as the success branch so callers can't tell whether the email
    // was even well-formed. The form already restricts client-side.
    return { success: true }
  }
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tableflow-sigma.vercel.app'}/auth/reset-password`

  // Custom SMTP (Resend) is configured on this project, so Supabase enforces
  // a per-user "1 recovery email per 60 seconds" cooldown rather than the
  // 2/hour project-wide cap. resetPasswordForEmail is the only call we need:
  // it generates the token and dispatches via the configured SMTP in one shot.
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  // Always return success regardless of whether the email exists or whether
  // SMTP rate-limited us. Anything else would let the form be used as an email
  // enumeration oracle.
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(RESTAURANT_COOKIE)
  redirect('/auth/login')
}
