'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateTableStatus } from '@/lib/supabase/queries';
import type { Table, TableStatus } from '@/types';

// Tap cycle for waiter quick-flip. Skips 'reserved' — that's a reservation
// concept, not something a waiter sets directly.
const NEXT_STATUS: Record<TableStatus, TableStatus> = {
  available: 'occupied',
  occupied:  'cleaning',
  cleaning:  'available',
  reserved:  'occupied',
};

const STATUS_LABEL: Record<TableStatus, string> = {
  available: 'Ελεύθερο',
  occupied:  'Κατειλημμένο',
  reserved:  'Κρατημένο',
  cleaning:  'Καθαρισμός',
};

const STATUS_STYLES: Record<TableStatus, { bg: string; text: string; ring: string; chip: string }> = {
  available: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-emerald-500/30', chip: 'bg-emerald-500' },
  occupied:  { bg: 'bg-red-500/10',     text: 'text-red-400',     ring: 'ring-red-500/30',     chip: 'bg-red-500' },
  cleaning:  { bg: 'bg-blue-500/10',    text: 'text-blue-400',    ring: 'ring-blue-500/30',    chip: 'bg-blue-500' },
  reserved:  { bg: 'bg-[#F97316]/10',   text: 'text-[#F97316]',   ring: 'ring-[#F97316]/30',   chip: 'bg-[#F97316]' },
};

export function FloorTab({ tables }: { tables: Table[] }) {
  const [pending, setPending] = useState<Set<string>>(new Set());

  if (tables.length === 0) {
    return (
      <div className="px-5 pt-12 text-center text-white/50 text-[13px]">
        Δεν υπάρχουν τραπέζια.
      </div>
    );
  }

  const handleCycle = async (table: Table) => {
    if (pending.has(table.id)) return;
    setPending(prev => new Set(prev).add(table.id));
    try {
      await updateTableStatus(table.id, NEXT_STATUS[table.status]);
    } catch (err) {
      console.error('[waiter] cycle status failed', err);
    } finally {
      setPending(prev => {
        const next = new Set(prev); next.delete(table.id); return next;
      });
    }
  };

  const counts = {
    available: tables.filter(t => t.status === 'available').length,
    occupied:  tables.filter(t => t.status === 'occupied').length,
    reserved:  tables.filter(t => t.status === 'reserved').length,
    cleaning:  tables.filter(t => t.status === 'cleaning').length,
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Status counts */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {(['available', 'occupied', 'reserved', 'cleaning'] as TableStatus[]).map(s => {
          const styles = STATUS_STYLES[s];
          return (
            <div key={s} className={cn('rounded-lg p-2', styles.bg)}>
              <div className={cn('text-lg font-bold tabular-nums', styles.text)}>{counts[s]}</div>
              <div className="text-[9px] uppercase tracking-wide text-white/50 font-semibold mt-0.5">
                {STATUS_LABEL[s].slice(0, 8)}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2-col table grid */}
      <div className="grid grid-cols-2 gap-3">
        {tables.map(t => {
          const styles = STATUS_STYLES[t.status];
          const isPending = pending.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => handleCycle(t)}
              disabled={isPending}
              className={cn(
                'relative bg-white/5 hover:bg-white/[0.07] rounded-xl p-4 border border-white/10 ring-2 transition-all active:scale-[0.97] text-left',
                styles.ring,
                isPending && 'opacity-60',
              )}
            >
              {/* Status chip */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.12em] text-white/50 font-bold">Τραπ.</span>
                <span className={cn('w-2.5 h-2.5 rounded-full', styles.chip)} />
              </div>

              {/* Table number */}
              <div className="text-[40px] font-extrabold leading-none tracking-tight tabular-nums text-white">
                {t.number}
              </div>

              {/* Seats */}
              <div className="flex items-center gap-1.5 mt-2 text-white/60 text-[12px] font-medium">
                <Users size={12} />
                {t.seats} άτομα
              </div>

              {/* Status (tap target communicates the action) */}
              <div className={cn(
                'mt-3 px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-center',
                styles.bg, styles.text,
              )}>
                {STATUS_LABEL[t.status]}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-white/30 pt-2">
        Πάτησε ένα τραπέζι για αλλαγή κατάστασης
      </p>
    </div>
  );
}
