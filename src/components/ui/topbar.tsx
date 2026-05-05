'use client';

import { useEffect, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { SearchDrawer } from './search-drawer';
import { NotificationsDrawer } from './notifications-drawer';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const [timeStr, setTimeStr] = useState<string>('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);

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
      <header className="h-16 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-[17px] font-bold text-[#0A0A0A] tracking-tight leading-none">{title}</h2>
          {subtitle && <p className="text-[12px] text-[#6B7280] mt-1">{subtitle}</p>}
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

      <SearchDrawer isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationsDrawer
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        onChange={setUnread}
      />
    </>
  );
}
