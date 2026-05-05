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
        'relative bg-white rounded-lg p-3 md:p-5 shadow-card hover:shadow-card-hover transition-shadow',
        accent ? 'border-2 border-[#F97316]' : 'border border-[#E5E7EB]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] md:text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.08em] truncate">
            {title}
          </p>
          <p className="mt-1.5 md:mt-2 text-[20px] md:text-[32px] font-extrabold text-[#0A0A0A] leading-none tracking-tight truncate">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1.5 md:mt-2 text-[11px] md:text-[13px] text-[#6B7280] truncate">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'mt-1.5 md:mt-2 text-[11px] md:text-[12px] font-semibold inline-flex items-center gap-1',
                trend.value >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
              )}
            >
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-[#6B7280] font-normal">{trend.label}</span>
            </p>
          )}
        </div>
        <div className="p-1.5 md:p-2.5 rounded-lg bg-[#F97316]/10 flex-shrink-0">
          <Icon size={16} className="md:hidden text-[#F97316]" strokeWidth={2.2} />
          <Icon size={20} className="hidden md:block text-[#F97316]" strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
}
