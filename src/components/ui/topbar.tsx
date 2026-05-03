'use client';

import { useEffect, useState } from 'react';
import { Bell, Search, Sun } from 'lucide-react';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const [timeStr, setTimeStr] = useState<string>('');

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

  return (
    <header className="h-16 bg-white border-b border-stone-100 px-6 flex items-center justify-between flex-shrink-0">
      <div>
        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
        {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {timeStr && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-500 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
            <Sun size={12} className="text-amber-500" />
            <span>{timeStr}</span>
          </div>
        )}

        <button className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors">
          <Search size={17} />
        </button>

        <button className="relative p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-terracotta rounded-full" />
        </button>
      </div>
    </header>
  );
}
