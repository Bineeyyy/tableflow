'use client';

import { memo } from 'react';
import { Table, TableStatus } from '@/types';
import { getStatusLabel, cn } from '@/lib/utils';
import { Users } from 'lucide-react';

// On dark canvas: dark fill + bright border + colored glow so tables pop.
const STATUS_COLORS: Record<TableStatus, { border: string; glow: string; accent: string }> = {
  available: { border: '#10B981', glow: 'rgba(16,185,129,0.45)', accent: '#10B981' },
  occupied:  { border: '#EF4444', glow: 'rgba(239,68,68,0.5)',   accent: '#EF4444' },
};

interface TableNodeProps {
  table: Table;
  isSelected: boolean;
  onClick: (table: Table) => void;
}

export const TableNode = memo(function TableNode({ table, isSelected, onClick }: TableNodeProps) {
  const colors = STATUS_COLORS[table.status];
  const free = table.status === 'available';

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
            'border-2 transition-transform duration-150',
            shapeClass,
            isSelected && 'ring-3 ring-offset-2 ring-[#F97316] ring-offset-[#0F0F0F] scale-110',
            !isSelected && 'hover:scale-105',
          )}
          style={{
            background: '#1A1A1A',
            borderColor: colors.border,
            boxShadow: isSelected
              ? `0 0 0 1px ${colors.border}, 0 0 24px ${colors.glow}`
              : `0 0 14px ${colors.glow}, 0 1px 2px rgba(0,0,0,0.4)`,
          }}
        >
          <span className="text-[12px] font-bold text-white tracking-tight tabular-nums">#{table.number}</span>
          {table.label && (
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.accent }}>{table.label}</span>
          )}
          <div className="flex items-center gap-0.5">
            <Users size={8} className="text-white/50" />
            <span className="text-[9px] text-white/60 font-semibold tabular-nums">
              {free ? `0/${table.seats}` : `${table.current_guests}/${table.seats}`}
            </span>
          </div>
        </div>

        {table.status === 'occupied' && (
          <span
            className="absolute inset-0 animate-ping opacity-30 pointer-events-none"
            style={{
              background: '#EF4444',
              borderRadius: shapeClass === 'rounded-full' ? '9999px' : '0.5rem',
            }}
          />
        )}
      </div>

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
        <div className="bg-white text-[#0A0A0A] text-[11px] rounded-md px-3 py-2 whitespace-nowrap shadow-pop border border-[#E5E7EB]">
          <div className="font-bold tracking-tight">Τραπέζι {table.number}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: colors.accent }}>{getStatusLabel(table.status)}</div>
          <div className="text-[#6B7280] text-[10px] tabular-nums">
            {free ? `0 / ${table.seats}` : `${table.current_guests} / ${table.seats}`} άτομα
          </div>
        </div>
        <div className="border-4 border-transparent border-t-white" />
      </div>
    </div>
  );
});
