'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, Users, UtensilsCrossed, Settings,
  MoreHorizontal, BarChart3, CreditCard, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavLinkHint } from './nav-link-hint';

const ITEMS = [
  { href: '/dashboard',              icon: LayoutGrid,       label: 'Κάτοψη' },
  { href: '/dashboard/reservations', icon: Users,            label: 'Κρατήσεις' },
  { href: '/dashboard/menu',         icon: UtensilsCrossed,  label: 'Μενού' },
  { href: '/dashboard/settings',     icon: Settings,         label: 'Ρυθμίσεις' },
] as const;

// Lives in the "More" sheet so the bottom bar stays at 5 slots without
// cramping on small phones. Add future overflow nav items here.
const MORE_ITEMS = [
  { href: '/dashboard/reports', icon: BarChart3,   label: 'Αναφορές',
    description: 'Στατιστικά εστιατορίου' },
  { href: '/dashboard/billing', icon: CreditCard,  label: 'Συνδρομή',
    description: 'Πλάνο και χρεώσεις' },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  // React 19 "adjust state during render" pattern — preferred over an
  // effect that calls setState, per react-hooks/set-state-in-effect.
  const [trackedPath, setTrackedPath] = useState(pathname);
  if (trackedPath !== pathname) {
    setTrackedPath(pathname);
    if (moreOpen) setMoreOpen(false);
  }

  // Highlight the More tab whenever the current route lives inside the sheet.
  const moreActive = MORE_ITEMS.some(({ href }) =>
    pathname === href || pathname.startsWith(href + '/'),
  );

  // Lock body scroll while the sheet is open and wire up Escape to close.
  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-white border-t border-[#E5E7EB] flex items-stretch pb-[env(safe-area-inset-bottom)]"
      >
        {ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-[12px] font-bold tracking-tight',
                isActive ? 'text-[#F97316]' : 'text-[#6B7280]'
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
              <span className="flex items-center gap-1">
                {label}
                <NavLinkHint />
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(o => !o)}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-sheet"
          aria-label="Περισσότερες επιλογές"
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 text-[12px] font-bold tracking-tight',
            moreActive || moreOpen ? 'text-[#F97316]' : 'text-[#6B7280]'
          )}
        >
          <MoreHorizontal size={20} strokeWidth={moreActive || moreOpen ? 2.4 : 2} />
          <span>Περισσότερα</span>
        </button>
      </nav>

      {/* Backdrop — click to dismiss. Pointer-events toggle so the bottom nav
          underneath stays interactive when the sheet is closed. */}
      <div
        onClick={() => setMoreOpen(false)}
        aria-hidden
        className={cn(
          'md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200',
          moreOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Bottom sheet — slides up from above the bottom nav. Sits at z-50 so it
          covers the nav, then offsets above it via bottom: 4rem (16). */}
      <div
        id="mobile-more-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Περισσότερα"
        className={cn(
          'md:hidden fixed inset-x-0 z-50 transition-transform duration-250',
          'bg-white rounded-t-2xl border-t border-[#E5E7EB] shadow-2xl',
          'pb-[env(safe-area-inset-bottom)]',
          moreOpen ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ bottom: 0 }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#6B7280]">
            Περισσότερα
          </p>
          <button
            type="button"
            onClick={() => setMoreOpen(false)}
            aria-label="Κλείσιμο"
            className="p-1.5 -mr-1.5 rounded-md text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F8F8F8]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-3 pb-4 pt-1 space-y-1">
          {MORE_ITEMS.map(({ href, icon: Icon, label, description }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                prefetch
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-[#F97316]/10 text-[#F97316]'
                    : 'text-[#0A0A0A] hover:bg-[#F8F8F8]',
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                  isActive ? 'bg-[#F97316]/15' : 'bg-[#F8F8F8]',
                )}>
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-[14px] font-bold tracking-tight',
                    isActive ? 'text-[#F97316]' : 'text-[#0A0A0A]',
                  )}>
                    {label}
                  </p>
                  <p className="text-[12px] text-[#6B7280] mt-0.5">{description}</p>
                </div>
              </Link>
            );
          })}
        </div>
        {/* Bottom buffer so the sheet content sits clear of the bottom nav
            stripe behind it. Mirrors the nav's 64px height. */}
        <div className="h-16" aria-hidden />
      </div>
    </>
  );
}
