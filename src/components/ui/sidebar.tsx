'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { logout } from '@/app/actions/auth';
import {
  LayoutGrid,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
  UtensilsCrossed,
  CreditCard,
  LogOut,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Κάτοψη', badge: null },
  { href: '/dashboard/orders', icon: ClipboardList, label: 'Παραγγελίες', badge: '4' },
  { href: '/dashboard/menu', icon: UtensilsCrossed, label: 'Μενού', badge: null },
  { href: '/dashboard/reservations', icon: Users, label: 'Κρατήσεις', badge: '2' },
  { href: '/dashboard/reports', icon: BarChart3, label: 'Αναφορές', badge: null },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Συνδρομή', badge: null },
  { href: '/dashboard/settings', icon: Settings, label: 'Ρυθμίσεις', badge: null },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 flex flex-col h-screen sticky top-0"
      style={{ background: '#0A0A0A' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F97316] flex items-center justify-center">
            <UtensilsCrossed size={18} className="text-white" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-white font-bold text-[15px] leading-none tracking-tight">TableFlow</h1>
            <p className="text-white/40 text-[11px] mt-1 font-medium">Restaurant OS</p>
          </div>
        </div>
      </div>

      {/* Restaurant selector */}
      <div className="px-3 py-3 border-b border-white/5">
        <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center">
              <span className="text-white text-xs font-bold">Τ</span>
            </div>
            <span className="text-white/90 text-[13px] font-medium">Ταβέρνα Αλέξης</span>
          </div>
          <ChevronRight size={14} className="text-white/30 group-hover:text-white/60 transition-colors" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-white/30 text-[10px] uppercase tracking-[0.12em] font-semibold px-3 mb-3">
          Κύριο Μενού
        </p>
        {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center justify-between pl-3 pr-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150',
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
              <div className="flex items-center gap-3">
                <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
                <span>{label}</span>
              </div>
              {badge && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[18px] text-center',
                    isActive
                      ? 'bg-[#F97316] text-white'
                      : 'bg-white/10 text-white/70'
                  )}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-[#F97316]/15 flex items-center justify-center flex-shrink-0 ring-1 ring-[#F97316]/30">
            <span className="text-[#F97316] text-[13px] font-bold">Α</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-semibold truncate leading-tight">Αλέξης Παπαδόπουλος</p>
            <p className="text-white/40 text-[11px] truncate mt-0.5">Ιδιοκτήτης</p>
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
  );
}
