'use client';

import { Table, TableStatus } from '@/types';
import { getStatusLabel, cn } from '@/lib/utils';
import { Users } from 'lucide-react';

const STATUS_COLORS: Record<TableStatus, { bg: string; border: string; text: string; glow: string }> = {
  available: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', glow: 'shadow-emerald-200' },
  occupied:  { bg: 'bg-red-50',     border: 'border-red-400',     text: 'text-red-700',     glow: 'shadow-red-200'     },
  reserved:  { bg: 'bg-amber-50',   border: 'border-amber-400',   text: 'text-amber-700',   glow: 'shadow-amber-200'   },
  cleaning:  { bg: 'bg-sky-50',     border: 'border-sky-400',     text: 'text-sky-700',     glow: 'shadow-sky-200'     },
};

interface TableNodeProps {
  table: Table;
  isSelected: boolean;
  onClick: (table: Table) => void;
}

export function TableNode({ table, isSelected, onClick }: TableNodeProps) {
  const colors = STATUS_COLORS[table.status];

  const sizeClass = table.shape === 'rectangle' ? 'w-28 h-16'
    : table.shape === 'round' ? 'w-16 h-16'
    : 'w-20 h-20';

  const shapeClass = table.shape === 'round' ? 'rounded-full' : 'rounded-xl';

  return (
    <div
      className="absolute cursor-pointer select-none group"
      style={{ left: table.x, top: table.y, transform: 'translate(-50%, -50%)' }}
      onClick={() => onClick(table)}
    >
      <div className={cn('relative flex items-center justify-center', sizeClass)}>
        <div
          className={cn(
            'w-full h-full flex flex-col items-center justify-center gap-0.5',
            'border-2 transition-all duration-200',
            colors.bg, colors.border, shapeClass,
            'shadow-md hover:shadow-lg',
            isSelected && `ring-3 ring-offset-2 ring-terracotta scale-110 shadow-xl ${colors.glow}`,
            !isSelected && 'hover:scale-105',
            colors.glow,
          )}
        >
          <span className="text-xs font-bold text-stone-700">#{table.number}</span>
          {table.label && (
            <span className="text-[9px] font-semibold text-terracotta uppercase tracking-wide">{table.label}</span>
          )}
          <div className="flex items-center gap-0.5">
            <Users size={8} className="text-stone-500" />
            <span className="text-[9px] text-stone-500">{table.seats}</span>
          </div>
        </div>

        {table.status === 'occupied' && (
          <span
            className="absolute inset-0 animate-ping opacity-20 bg-red-400 pointer-events-none"
            style={{ borderRadius: shapeClass === 'rounded-full' ? '9999px' : '0.75rem' }}
          />
        )}
      </div>

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
        <div className="bg-stone-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
          <div className="font-semibold">Τραπέζι {table.number}</div>
          <div className={cn('text-xs', colors.text.replace('700', '400'))}>{getStatusLabel(table.status)}</div>
          <div className="text-stone-400">{table.seats} θέσεις</div>
        </div>
        <div className="border-4 border-transparent border-t-stone-900" />
      </div>
    </div>
  );
}
