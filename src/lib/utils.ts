import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TableStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStatusLabel(status: TableStatus): string {
  const labels: Record<TableStatus, string> = {
    available: 'Ελεύθερο',
    occupied: 'Κατειλημμένο',
  };
  return labels[status];
}

export function getStatusColor(status: TableStatus): string {
  const colors: Record<TableStatus, string> = {
    available: '#10B981',
    occupied: '#EF4444',
  };
  return colors[status];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatTime(date: string): string {
  return new Intl.DateTimeFormat('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
