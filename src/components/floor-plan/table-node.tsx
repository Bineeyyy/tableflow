'use client';

import { Table, TableStatus } from '@/types';
import { getStatusLabel, cn } from '@/lib/utils';
import { Users } from 'lucide-react';

const STATUS_COLORS: Record<TableStatus, { bg: string; border: string; text: string }> = {
  available: { bg: 'bg-[#ECFDF5]', border: 'border-[#10B981]', text: 'text-[#047857]' },
  occupied:  { bg: 'bg-[#FEF2F2]', border: 'border-[#EF4444]', text: 'text-[#B91C1C]' },
  reserved:  { bg: 'bg-[#FFF4ED]', border: 'border-[#F97316]', text: 'text-[#C2410C]' },
  cleaning:  { bg: 'bg-[#EFF6FF]', border: 'border-[#3B82F6]', text: 'text-[#1D4ED8]' },
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

  const shapeClass = table.shape === 'round' ? 'rounded-full' : 'rounded-lg';

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
            'border-2 transition-all duration-150',
            colors.bg, colors.border, shapeClass,
            'shadow-card hover:shadow-card-hover',
            isSelected && 'ring-3 ring-offset-2 ring-[#F97316] scale-110',
            !isSelected && 'hover:scale-105',
          )}
        >
          <span className="text-[12px] font-bold text-[#0A0A0A] tracking-tight">#{table.number}</span>
          {table.label && (
            <span className="text-[9px] font-bold text-[#F97316] uppercase tracking-wider">{table.label}</span>
          )}
          <div className="flex items-center gap-0.5">
            <Users size={8} className="text-[#6B7280]" />
            <span className="text-[9px] text-[#6B7280] font-semibold">{table.seats}</span>
          </div>
        </div>

        {table.status === 'occupied' && (
          <span
            className="absolute inset-0 animate-ping opacity-20 bg-[#EF4444] pointer-events-none"
            style={{ borderRadius: shapeClass === 'rounded-full' ? '9999px' : '0.5rem' }}
          />
        )}
      </div>

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
        <div className="bg-[#0A0A0A] text-white text-[11px] rounded-md px-3 py-2 whitespace-nowrap shadow-pop">
          <div className="font-bold tracking-tight">Τραπέζι {table.number}</div>
          <div className="text-[10px] text-[#F97316] font-semibold uppercase tracking-wide mt-0.5">{getStatusLabel(table.status)}</div>
          <div className="text-white/60 text-[10px]">{table.seats} θέσεις</div>
        </div>
        <div className="border-4 border-transparent border-t-[#0A0A0A]" />
      </div>
    </div>
  );
}
