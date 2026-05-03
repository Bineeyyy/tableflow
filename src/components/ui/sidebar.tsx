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
    <aside className="w-64 bg-stone-950 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-terracotta flex items-center justify-center shadow-lg shadow-terracotta/30">
            <UtensilsCrossed size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">TableFlow</h1>
            <p className="text-stone-500 text-xs mt-0.5">Διαχείριση Τραπεζιών</p>
          </div>
        </div>
      </div>

      {/* Restaurant selector */}
      <div className="px-4 py-3 border-b border-stone-800">
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 transition-colors group">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-terracotta/20 flex items-center justify-center">
              <span className="text-terracotta text-xs font-bold">Τ</span>
            </div>
            <span className="text-stone-300 text-sm font-medium">Ταβέρνα Αλέξης</span>
          </div>
          <ChevronRight size={14} className="text-stone-600 group-hover:text-stone-400 transition-colors" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-stone-600 text-[10px] uppercase tracking-widest font-semibold px-3 mb-2">Κύριο Μενού</p>
        {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-terracotta text-white shadow-md shadow-terracotta/30'
                  : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon size={17} />
                <span>{label}</span>
              </div>
              {badge && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                  isActive ? 'bg-white/20 text-white' : 'bg-terracotta/20 text-terracotta'
                )}>
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="p-3 border-t border-stone-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-terracotta/20 flex items-center justify-center flex-shrink-0">
            <span className="text-terracotta text-sm font-bold">Α</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-stone-300 text-sm font-medium truncate">Αλέξης Παπαδόπουλος</p>
            <p className="text-stone-600 text-xs truncate">Ιδιοκτήτης</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Αποσύνδεση"
              className="text-stone-600 hover:text-stone-300 transition-colors p-1 rounded-lg hover:bg-stone-800"
            >
              <LogOut size={14} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
