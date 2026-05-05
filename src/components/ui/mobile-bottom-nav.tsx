'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Users, UtensilsCrossed, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/dashboard',              icon: LayoutGrid,       label: 'Κάτοψη' },
  { href: '/dashboard/reservations', icon: Users,            label: 'Κρατήσεις' },
  { href: '/dashboard/menu',         icon: UtensilsCrossed,  label: 'Μενού' },
  { href: '/dashboard/settings',     icon: Settings,         label: 'Ρυθμίσεις' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
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
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold tracking-tight',
              isActive ? 'text-[#F97316]' : 'text-[#6B7280]'
            )}
          >
            <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
