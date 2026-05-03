import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TableStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStatusLabel(status: TableStatus): string {
  const labels: Record<TableStatus, string> = {
    available: 'Διαθέσιμο',
    occupied: 'Κατειλημμένο',
    reserved: 'Κρατημένο',
    cleaning: 'Καθαρισμός',
  };
  return labels[status];
}

export function getStatusColor(status: TableStatus): string {
  const colors: Record<TableStatus, string> = {
    available: '#4CAF50',
    occupied: '#C0392B',
    reserved: '#E67E22',
    cleaning: '#3498DB',
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
