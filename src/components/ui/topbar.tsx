'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Bell, Search, Menu } from 'lucide-react';
import { useMobileNav } from '@/lib/mobile-nav-context';

// Drawers are heavy (Supabase client + filtered results). Defer their JS until
// the first time the user opens one.
const SearchDrawer = dynamic(
  () => import('./search-drawer').then(m => ({ default: m.SearchDrawer })),
  { ssr: false }
);
const NotificationsDrawer = dynamic(
  () => import('./notifications-drawer').then(m => ({ default: m.NotificationsDrawer })),
  { ssr: false }
);

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const [timeStr, setTimeStr] = useState<string>('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { setOpen: setMobileNavOpen } = useMobileNav();

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('el-GR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
    const update = () => {
      const raw = fmt.format(new Date());
      setTimeStr(raw.charAt(0).toUpperCase() + raw.slice(1));
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  // Cmd/Ctrl+K opens search globally
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header className="h-16 bg-white border-b border-[#E5E7EB] px-4 md:px-6 flex items-center justify-between flex-shrink-0 gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Άνοιγμα μενού"
            className="md:hidden -ml-1.5 p-2 rounded-md text-[#0A0A0A] hover:bg-[#F8F8F8] flex-shrink-0"
          >
            <Menu size={20} strokeWidth={2.2} />
          </button>
          <div className="min-w-0">
            <h2 className="text-[15px] md:text-[17px] font-bold text-[#0A0A0A] tracking-tight leading-none truncate">{title}</h2>
            {subtitle && <p className="text-[11px] md:text-[12px] text-[#6B7280] mt-1 truncate">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {timeStr && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280] px-3 py-1.5 rounded-md border border-[#E5E7EB] bg-white">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>{timeStr}</span>
            </div>
          )}

          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Αναζήτηση"
            className="p-2 rounded-md hover:bg-[#F8F8F8] text-[#6B7280] hover:text-[#0A0A0A]"
          >
            <Search size={17} strokeWidth={2.2} />
          </button>

          <button
            onClick={() => setNotifOpen(true)}
            aria-label="Ειδοποιήσεις"
            className="relative p-2 rounded-md hover:bg-[#F8F8F8] text-[#6B7280] hover:text-[#0A0A0A]"
          >
            <Bell size={17} strokeWidth={2.2} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#F97316] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white tabular-nums">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>
      </header>

      {searchOpen && (
        <SearchDrawer isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
      {notifOpen && (
        <NotificationsDrawer
          isOpen={notifOpen}
          onClose={() => setNotifOpen(false)}
          onChange={setUnread}
        />
      )}
    </>
  );
}
