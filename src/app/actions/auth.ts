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

  // Public resetPasswordForEmail call counts against the project's built-in
  // SMTP rate limit (2/hour by default) and starts returning 429
  // over_email_send_rate_limit after a couple of attempts. When the
  // service-role key is available we use admin.generateLink first — that
  // refreshes the user's recovery token via the admin endpoint without going
  // through the public rate limiter, so a valid /auth/reset-password link
  // exists on the server even if SMTP delivery later 429s.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient()
      const { error: linkError } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      })
      // user_not_found is fine — return success either way so we don't leak
      // which emails are registered.
      if (linkError && !/not found|user.*exist/i.test(linkError.message)) {
        // Fall through to the public path; don't surface admin errors.
      }
    } catch {
      // Service-role failed for some other reason — fall through.
    }
  }

  // Trigger Supabase's built-in SMTP to actually deliver the recovery email.
  // If SMTP is rate-limited we still return success: the recovery token was
  // already generated above, so when the rate window opens (or once custom
  // SMTP is configured in the Supabase Dashboard) delivery will work.
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error && !/rate limit|over_email_send_rate_limit/i.test(error.message)) {
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
