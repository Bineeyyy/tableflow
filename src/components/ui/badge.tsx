import { cn } from '@/lib/utils';
import { TableStatus } from '@/types';
import { getStatusLabel } from '@/lib/utils';

const statusStyles: Record<TableStatus, string> = {
  available: 'bg-green-100 text-green-800 border-green-200',
  occupied: 'bg-red-100 text-red-800 border-red-200',
  reserved: 'bg-orange-100 text-orange-800 border-orange-200',
  cleaning: 'bg-blue-100 text-blue-800 border-blue-200',
};

interface StatusBadgeProps {
  status: TableStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusStyles[status],
        className
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
