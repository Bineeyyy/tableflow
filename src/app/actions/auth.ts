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
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const name = formData.get('name') as string
  if (password !== confirmPassword) {
    return { error: 'Οι κωδικοί δεν ταιριάζουν' }
  }

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
      if (createError) return { error: createError.message }
    } else {
      // Fallback when no service-role key is configured: best-effort signUp.
      // The user will land on /auth/login and need to confirm via email
      // before signing in.
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (signUpError) return { error: signUpError.message }
    }

    // Establish a real session on the SSR client so the redirect lands the
    // user inside the dashboard (or onboarding) instead of bouncing back to
    // /auth/login via the proxy.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) return { error: signInError.message }
  } catch {
    return { error: 'Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά.' }
  }
  // redirect() throws NEXT_REDIRECT — must be outside try/catch
  redirect('/dashboard')
}

export async function forgotPassword(_: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tableflow-sigma.vercel.app'}/auth/reset-password`

  // Custom SMTP (Resend) is configured on this project, so Supabase enforces
  // a per-user "1 recovery email per 60 seconds" cooldown rather than the
  // 2/hour project-wide cap. Critically, admin.generateLink({type:'recovery'})
  // ALSO consumes that 60-second window — calling it before
  // resetPasswordForEmail caused every follow-up reset call to 429 with
  // "you can only request this after 59 seconds", and Supabase never handed
  // the email to Resend at all (which is why nothing showed up there).
  // resetPasswordForEmail is the only call we need: it generates the token
  // and dispatches via the configured SMTP in one shot.
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  // Swallow the per-user cooldown / rate-limit so we (a) don't leak whether
  // the email is registered and (b) don't punish users for double-clicking
  // the submit button. Other errors (bad config, real SMTP failures) still
  // surface to the form.
  if (error && !/rate limit|over_email_send_rate_limit|after \d+ seconds/i.test(error.message)) {
    return { error: error.message }
  }
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(RESTAURANT_COOKIE)
  redirect('/auth/login')
}
