import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAccessBlocked } from '@/lib/stripe'

const RESTAURANT_COOKIE = 'tf_restaurant_id'
const SUB_STATUS_COOKIE = 'tf_sub_status'
// Sub-status cookie refreshes every hour so subscription changes propagate quickly
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

  // Unauthenticated users cannot access dashboard or onboarding
  if (!user && (path.startsWith('/dashboard') || path === '/onboarding')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Authenticated users are bounced away from auth pages
  if (user && (path === '/auth/login' || path === '/auth/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && path.startsWith('/dashboard')) {
    const restaurantId = request.cookies.get(RESTAURANT_COOKIE)?.value
    const cachedStatus = request.cookies.get(SUB_STATUS_COOKIE)?.value

    if (!restaurantId) {
      // Full check: find restaurant and subscription status
      const { data } = await supabase
        .from('restaurants')
        .select('id, subscription_status')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

      if (!data) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      const status = data.subscription_status ?? 'none'
      supabaseResponse.cookies.set(RESTAURANT_COOKIE, data.id, {
        path: '/', httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60,
      })
      supabaseResponse.cookies.set(SUB_STATUS_COOKIE, status, {
        path: '/', httpOnly: true, sameSite: 'lax', maxAge: SUB_STATUS_TTL,
      })

      if (isAccessBlocked(status) && !path.startsWith('/dashboard/billing')) {
        return NextResponse.redirect(new URL('/dashboard/billing', request.url))
      }
    } else if (!cachedStatus) {
      // Restaurant known but status cache expired — recheck only subscription_status
      const { data } = await supabase
        .from('restaurants')
        .select('subscription_status')
        .eq('id', restaurantId)
        .maybeSingle()

      const status = data?.subscription_status ?? 'none'
      supabaseResponse.cookies.set(SUB_STATUS_COOKIE, status, {
        path: '/', httpOnly: true, sameSite: 'lax', maxAge: SUB_STATUS_TTL,
      })

      if (isAccessBlocked(status) && !path.startsWith('/dashboard/billing')) {
        return NextResponse.redirect(new URL('/dashboard/billing', request.url))
      }
    } else if (isAccessBlocked(cachedStatus) && !path.startsWith('/dashboard/billing')) {
      return NextResponse.redirect(new URL('/dashboard/billing', request.url))
    }
  }

  // Authenticated user with a restaurant visiting /onboarding → send to dashboard
  if (user && path === '/onboarding') {
    const restaurantId = request.cookies.get(RESTAURANT_COOKIE)?.value
    if (restaurantId) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
