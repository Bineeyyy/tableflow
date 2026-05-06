import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// Best-effort client-IP read. Vercel populates `x-forwarded-for` with a
// comma-separated chain; the leftmost address is the original client. Falls
// back to `x-real-ip` (non-Vercel proxies) and finally to a constant — which
// effectively rate-limits ALL anonymous traffic together when we can't tell
// callers apart, which is the safe failure mode.
export async function getClientIp(): Promise<string> {
  const h = await headers()
  const xff = h.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0].trim()
    if (first) return first
  }
  return h.get('x-real-ip') ?? 'unknown'
}

// Atomic check-and-increment against the public.consume_rate_limit() Postgres
// function. Returns true when the call is allowed, false when the limit has
// been hit for the current window.
//
// On DB error we fail OPEN (return true). The reasoning: a transient DB blip
// shouldn't lock every legitimate user out of login. The downside is that the
// limiter doesn't help during an outage — but during an outage, the auth
// endpoints aren't doing much anyway.
export async function consumeRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const sb = await createClient()
    const { data, error } = await sb.rpc('consume_rate_limit', {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      console.error('[rate-limit] rpc failed:', error.message)
      return true
    }
    return data === true
  } catch (e) {
    console.error('[rate-limit] threw:', e instanceof Error ? e.message : e)
    return true
  }
}
