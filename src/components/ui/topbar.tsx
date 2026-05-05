'use client';

import { useEffect, useState } from 'react';
import { Bell, Search } from 'lucide-react';

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

        <button className="p-2 rounded-md hover:bg-[#F8F8F8] text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
          <Search size={17} strokeWidth={2.2} />
        </button>

        <button className="relative p-2 rounded-md hover:bg-[#F8F8F8] text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
          <Bell size={17} strokeWidth={2.2} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F97316] rounded-full ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}
