import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAccessAllowed } from '@/lib/stripe'

const RESTAURANT_COOKIE = 'tf_restaurant_id'
const SUB_STATUS_COOKIE = 'tf_sub_status'
const TRIAL_ENDS_COOKIE = 'tf_trial_ends'
// Refresh the status + trial cookies once an hour so subscription changes
// and trial-clock ticks propagate without forcing a DB hit on every nav.
const SUB_STATUS_TTL = 60 * 60

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (!user && (path.startsWith('/dashboard') || path === '/onboarding')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user && (path === '/auth/login' || path === '/auth/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && path.startsWith('/dashboard')) {
    const restaurantId = request.cookies.get(RESTAURANT_COOKIE)?.value
    const cachedStatus = request.cookies.get(SUB_STATUS_COOKIE)?.value
    const cachedTrialEnds = request.cookies.get(TRIAL_ENDS_COOKIE)?.value

    if (!restaurantId) {
      const { data } = await supabase
        .from('restaurants')
        .select('id, subscription_status, trial_ends_at')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

      if (!data) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      const status = data.subscription_status ?? 'none'
      const trialEnds = data.trial_ends_at ?? ''
      supabaseResponse.cookies.set(RESTAURANT_COOKIE, data.id, {
        path: '/', httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60,
      })
      supabaseResponse.cookies.set(SUB_STATUS_COOKIE, status, {
        path: '/', httpOnly: true, sameSite: 'lax', maxAge: SUB_STATUS_TTL,
      })
      supabaseResponse.cookies.set(TRIAL_ENDS_COOKIE, trialEnds, {
        path: '/', httpOnly: true, sameSite: 'lax', maxAge: SUB_STATUS_TTL,
      })

      if (!isAccessAllowed(status, trialEnds || null) && !path.startsWith('/dashboard/billing')) {
        return NextResponse.redirect(new URL('/dashboard/billing', request.url))
      }
    } else if (!cachedStatus || cachedTrialEnds === undefined) {
      const { data } = await supabase
        .from('restaurants')
        .select('subscription_status, trial_ends_at')
        .eq('id', restaurantId)
        .maybeSingle()

      if (!data) {
        const redirect = NextResponse.redirect(new URL('/onboarding', request.url))
        redirect.cookies.delete(RESTAURANT_COOKIE)
        redirect.cookies.delete(SUB_STATUS_COOKIE)
        redirect.cookies.delete(TRIAL_ENDS_COOKIE)
        return redirect
      }

      const status = data.subscription_status ?? 'none'
      const trialEnds = data.trial_ends_at ?? ''
      supabaseResponse.cookies.set(SUB_STATUS_COOKIE, status, {
        path: '/', httpOnly: true, sameSite: 'lax', maxAge: SUB_STATUS_TTL,
      })
      supabaseResponse.cookies.set(TRIAL_ENDS_COOKIE, trialEnds, {
        path: '/', httpOnly: true, sameSite: 'lax', maxAge: SUB_STATUS_TTL,
      })

      if (!isAccessAllowed(status, trialEnds || null) && !path.startsWith('/dashboard/billing')) {
        return NextResponse.redirect(new URL('/dashboard/billing', request.url))
      }
    } else if (
      !isAccessAllowed(cachedStatus, cachedTrialEnds || null)
      && !path.startsWith('/dashboard/billing')
    ) {
      return NextResponse.redirect(new URL('/dashboard/billing', request.url))
    }
  }

  if (user && path === '/onboarding') {
    const restaurantId = request.cookies.get(RESTAURANT_COOKIE)?.value
    if (restaurantId) {
      const { data } = await supabase
        .from('restaurants')
        .select('id')
        .eq('id', restaurantId)
        .maybeSingle()
      if (data) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      supabaseResponse.cookies.delete(RESTAURANT_COOKIE)
      supabaseResponse.cookies.delete(SUB_STATUS_COOKIE)
      supabaseResponse.cookies.delete(TRIAL_ENDS_COOKIE)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
