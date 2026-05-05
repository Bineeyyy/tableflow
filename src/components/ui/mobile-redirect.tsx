'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Funnels narrow viewports straight to the waiter view. Real restaurants run
// the dashboard on desktop/tablet and only ever touch a phone via the waiter
// app — splitting the experiences here means we never have to make the
// dense desktop dashboard "responsive enough" for a 360px screen.
export function MobileRedirect({ to = '/dashboard/waiter', breakpoint = 1024 }: { to?: string; breakpoint?: number }) {
  const router = useRouter();

  useEffect(() => {
    const check = () => {
      if (typeof window !== 'undefined' && window.innerWidth < breakpoint) {
        router.replace(to);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [router, to, breakpoint]);

  return null;
}
