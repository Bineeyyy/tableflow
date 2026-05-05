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
        'relative bg-white rounded-lg p-5 border border-[#E5E7EB] shadow-card hover:shadow-card-hover transition-shadow overflow-hidden',
        className
      )}
    >
      {accent && (
        <span
          aria-hidden
          className="absolute top-0 left-0 right-0 h-[3px] bg-[#F97316]"
        />
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.08em]">
            {title}
          </p>
          <p className="mt-2 text-[32px] font-extrabold text-[#0A0A0A] leading-none tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="mt-2 text-[13px] text-[#6B7280]">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'mt-2 text-[12px] font-semibold inline-flex items-center gap-1',
                trend.value >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
              )}
            >
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-[#6B7280] font-normal">{trend.label}</span>
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-lg bg-[#F97316]/10">
          <Icon size={20} className="text-[#F97316]" strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
}
