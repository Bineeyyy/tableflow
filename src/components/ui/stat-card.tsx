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
}

export function StatCard({ title, value, subtitle, icon: Icon, iconColor = 'text-terracotta', trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-2xl p-5 shadow-sm border border-stone-100 hover:shadow-md transition-shadow', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-stone-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-stone-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-stone-400">{subtitle}</p>}
          {trend && (
            <p className={cn('mt-2 text-xs font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-500')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl bg-terracotta/10', iconColor)}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
