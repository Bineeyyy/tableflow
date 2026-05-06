'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { logout } from '@/app/actions/auth';
import { useMobileNav } from '@/lib/mobile-nav-context';
import { NavLinkHint } from './nav-link-hint';
import {
  LayoutGrid,
  Users,
  BarChart3,
  Settings,
  UtensilsCrossed,
  CreditCard,
  LogOut,
  ChevronRight,
  X,
} from 'lucide-react';

type NavItem = { href: string; icon: typeof LayoutGrid; label: string; badge: string | null };

interface SidebarProps {
  reservationsBadge?: number;
  restaurantName?: string;
  userLabel?: string;
  userRole?: string;
}

export function Sidebar({
  reservationsBadge = 0,
  restaurantName,
  userLabel,
  userRole,
}: SidebarProps) {
  const pathname = usePathname();
  const { open, setOpen } = useMobileNav();
  const close = () => setOpen(false);

  const restaurantInitial = (restaurantName?.trim()?.[0] ?? '·').toUpperCase();
  const userInitial = (userLabel?.trim()?.[0] ?? '·').toUpperCase();

  // Reservations badge reflects today's live (non-cancelled, non-completed)
  // reservation count from Supabase. 0 hides the badge entirely.
  const navItems: NavItem[] = [
    { href: '/dashboard', icon: LayoutGrid, label: 'Κάτοψη', badge: null },
    { href: '/dashboard/menu', icon: UtensilsCrossed, label: 'Μενού', badge: null },
    {
      href: '/dashboard/reservations',
      icon: Users,
      label: 'Κρατήσεις',
      badge: reservationsBadge > 0 ? String(reservationsBadge) : null,
    },
    { href: '/dashboard/reports', icon: BarChart3, label: 'Αναφορές', badge: null },
    { href: '/dashboard/billing', icon: CreditCard, label: 'Συνδρομή', badge: null },
    { href: '/dashboard/settings', icon: Settings, label: 'Ρυθμίσεις', badge: null },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={close}
        aria-hidden
        className={cn(
          'md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />

      <aside
        className={cn(
          'flex flex-col h-screen z-50',
          // Tablet (md..lg): icon-only column. Desktop (lg+): full 256px sidebar.
          'md:sticky md:top-0 md:w-16 lg:w-64 md:translate-x-0 md:transition-none',
          // Mobile (<md): fixed drawer slides in from the left
          'fixed top-0 left-0 w-72 max-w-[85vw] transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{ background: '#0A0A0A' }}
      >
      {/* Logo — full at mobile/desktop, icon-only at tablet */}
      <div className="px-5 md:px-3 lg:px-5 py-5 border-b border-white/5 flex items-center justify-between md:justify-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F97316] flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed size={18} className="text-white" strokeWidth={2.4} />
          </div>
          <div className="md:hidden lg:block">
            <h1 className="text-white font-bold text-[15px] leading-none tracking-tight">TableFlow</h1>
            <p className="text-white/40 text-[11px] mt-1 font-medium">Restaurant OS</p>
          </div>
        </div>
        <button
          onClick={close}
          aria-label="Κλείσιμο μενού"
          className="md:hidden text-white/50 hover:text-white p-1.5 -mr-1.5 rounded-md hover:bg-white/5"
        >
          <X size={18} />
        </button>
      </div>

      {/* Restaurant selector — drawer + desktop only */}
      {restaurantName && (
        <div className="px-3 py-3 border-b border-white/5 md:hidden lg:block">
          <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{restaurantInitial}</span>
              </div>
              <span className="text-white/90 text-[13px] font-medium truncate">{restaurantName}</span>
            </div>
            <ChevronRight size={14} className="text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Subtle divider on tablet (replaces the restaurant selector block) */}
      <div className="hidden md:block lg:hidden border-b border-white/5" />

      {/* Navigation */}
      <nav className="flex-1 px-2 md:px-2 lg:px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-white/30 text-[10px] uppercase tracking-[0.12em] font-semibold px-3 mb-3 md:hidden lg:block">
          Κύριο Μενού
        </p>
        {navItems.map(({ href, icon: Icon, label, badge }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              prefetch
              onClick={close}
              title={label}
              className={cn(
                'relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-150',
                // Tablet: centered icon, no labels. Mobile/desktop: row with label + badge.
                'pl-3 pr-3 py-2.5 justify-between',
                'md:px-0 md:py-2.5 md:justify-center',
                'lg:pl-3 lg:pr-3 lg:justify-between',
                isActive
                  ? 'text-[#F97316] bg-[#F97316]/10'
                  : 'text-white/55 hover:text-white hover:bg-white/5'
              )}
            >
              {/* Active left bar */}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[#F97316]"
                  style={{ boxShadow: '0 0 12px rgba(249, 115, 22, 0.6)' }}
                />
              )}
              <div className="flex items-center gap-3 md:gap-0 lg:gap-3">
                <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                <span className="md:hidden lg:inline">{label}</span>
                <NavLinkHint className="md:hidden lg:inline-block" />
              </div>
              {badge && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[18px] text-center md:hidden lg:inline-flex',
                    isActive
                      ? 'bg-[#F97316] text-white'
                      : 'bg-white/10 text-white/70'
                  )}
                >
                  {badge}
                </span>
              )}
              {/* Tablet-only badge dot — orange pip in the corner */}
              {badge && (
                <span
                  aria-hidden
                  className="hidden md:block lg:hidden absolute top-1.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#F97316]"
                  style={{ boxShadow: '0 0 6px rgba(249,115,22,0.7)' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="p-3 border-t border-white/5">
        {/* Tablet: stack avatar + logout button vertically and centered */}
        <div className="flex items-center gap-3 px-2 py-2 md:flex-col md:gap-2 md:px-0 lg:flex-row lg:gap-3 lg:px-2">
          <div className="w-8 h-8 rounded-full bg-[#F97316]/15 flex items-center justify-center flex-shrink-0 ring-1 ring-[#F97316]/30">
            <span className="text-[#F97316] text-[13px] font-bold">{userInitial}</span>
          </div>
          <div className="flex-1 min-w-0 md:hidden lg:block">
            <p className="text-white text-[13px] font-semibold truncate leading-tight">{userLabel ?? '—'}</p>
            {userRole && (
              <p className="text-white/40 text-[11px] truncate mt-0.5">{userRole}</p>
            )}
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Αποσύνδεση"
              className="text-white/40 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/5"
            >
              <LogOut size={14} />
            </button>
          </form>
        </div>
      </div>
      </aside>
    </>
  );
}
