import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; label: string };
  className?: string;
  accent?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  accent = true,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative isolate bg-white rounded-xl overflow-hidden',
        'p-3.5 md:p-5',
        // Layered baseline shadow + warmer hover shadow with orange tint
        'kpi-card transition-shadow duration-200',
        accent ? 'border-2 border-[#F97316]' : 'border border-[#E5E7EB]',
        className
      )}
    >
      {/* Soft orange corner-wash for depth */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-14 -right-14 w-36 h-36 rounded-full bg-[#F97316]/[0.06] blur-2xl"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] md:text-[11px] font-bold text-[#6B7280] uppercase tracking-[0.1em] truncate">
            {title}
          </p>
          <p className="mt-2 md:mt-3 text-[24px] md:text-[34px] font-extrabold text-[#0A0A0A] leading-none tracking-tight tabular-nums truncate">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1.5 md:mt-2 text-[11px] md:text-[12px] text-[#6B7280] font-medium leading-snug truncate">
              {subtitle}
            </p>
          )}
          {trend && (
            <span
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-md',
                trend.value >= 0
                  ? 'bg-[#10B981]/10 text-[#047857] ring-1 ring-inset ring-[#10B981]/20'
                  : 'bg-[#EF4444]/10 text-[#B91C1C] ring-1 ring-inset ring-[#EF4444]/20'
              )}
            >
              <span className="tabular-nums">
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-[#6B7280] font-medium">{trend.label}</span>
            </span>
          )}
        </div>

        {/* Solid orange icon tile — gradient + inset highlight + outer glow */}
        <div
          className="relative flex-shrink-0 flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
            boxShadow:
              '0 6px 16px rgba(249, 115, 22, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.28), inset 0 -1px 0 rgba(0, 0, 0, 0.08)',
          }}
        >
          <Icon size={17} className="md:hidden text-white" strokeWidth={2.4} />
          <Icon size={22} className="hidden md:block text-white" strokeWidth={2.4} />
        </div>
      </div>
    </div>
  );
}
