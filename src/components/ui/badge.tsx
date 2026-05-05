import { cn } from '@/lib/utils';
import { TableStatus } from '@/types';
import { getStatusLabel } from '@/lib/utils';

const statusStyles: Record<TableStatus, string> = {
  available: 'bg-[#10B981]/10 text-[#047857] ring-1 ring-inset ring-[#10B981]/20',
  occupied: 'bg-[#EF4444]/10 text-[#B91C1C] ring-1 ring-inset ring-[#EF4444]/20',
};

interface StatusBadgeProps {
  status: TableStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide',
        statusStyles[status],
        className
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
