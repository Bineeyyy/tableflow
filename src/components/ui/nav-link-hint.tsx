'use client';

import { useLinkStatus } from 'next/link';
import { cn } from '@/lib/utils';

// Pulse appears only after a short delay, so fast navigations feel instant
// (no skeleton flash) and only slow ones get a visible hint.
export function NavLinkHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none inline-block w-1.5 h-1.5 rounded-full bg-current',
        'transition-opacity duration-150',
        pending ? 'opacity-60 animate-pulse delay-100' : 'opacity-0',
        className,
      )}
    />
  );
}
