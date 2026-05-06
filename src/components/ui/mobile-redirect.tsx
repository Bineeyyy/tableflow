'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Set by the waiter view's "Πλήρης Προβολή" (Desktop View) option so that
// a phone user who explicitly chooses the desktop dashboard isn't bounced
// straight back to /dashboard/waiter on every navigation.
export const FORCE_DESKTOP_KEY = 'tf_force_desktop';

// Funnels narrow viewports straight to the waiter view. Real restaurants run
// the dashboard on desktop/tablet and only ever touch a phone via the waiter
// app — splitting the experiences here means we never have to make the
// dense desktop dashboard "responsive enough" for a 360px screen.
export function MobileRedirect({ to = '/dashboard/waiter', breakpoint = 768 }: { to?: string; breakpoint?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const check = () => {
      if (sessionStorage.getItem(FORCE_DESKTOP_KEY) === 'true') return;
      if (window.innerWidth < breakpoint) {
        router.replace(to);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [router, to, breakpoint]);

  return null;
}
