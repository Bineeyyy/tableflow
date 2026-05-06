import type { NextRequest } from 'next/server'

// Server actions are CSRF-protected by Next (it stamps an action id and
// rejects mismatches). Route handlers are not — a cross-origin POST to
// /api/checkout from a malicious page would otherwise inherit the user's
// session cookies and start a checkout for them. Reject anything whose
// Origin header doesn't match the request's own origin; missing-Origin
// POSTs (header stripped or non-browser caller) are rejected too because
// the billing endpoints have no legitimate non-browser caller.
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).origin === request.nextUrl.origin
  } catch {
    return false
  }
}
