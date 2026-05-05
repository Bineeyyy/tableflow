'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setTableOccupancy } from '@/app/actions/waiter';
import { OccupyModal } from '@/components/ui/occupy-modal';
import type { Table } from '@/types';

export function FloorTab({ tables }: { tables: Table[] }) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [occupyTarget, setOccupyTarget] = useState<Table | null>(null);

  if (tables.length === 0) {
    return (
      <div className="px-5 pt-12 text-center text-white/50 text-[13px]">
        Δεν υπάρχουν τραπέζια.
      </div>
    );
  }

  const startPending = (id: string) =>
    setPending(prev => { const next = new Set(prev); next.add(id); return next; });
  const endPending = (id: string) =>
    setPending(prev => { const next = new Set(prev); next.delete(id); return next; });

  const handleTap = (table: Table) => {
    if (pending.has(table.id)) return;
    if (table.status === 'occupied') {
      // Free immediately, no confirmation.
      startPending(table.id);
      setTableOccupancy(table.id, { occupied: false }).finally(() => endPending(table.id));
    } else {
      setOccupyTarget(table);
    }
  };

  const confirmOccupy = async (guests: number) => {
    if (!occupyTarget) return;
    startPending(occupyTarget.id);
    setOccupyTarget(null);
    try {
      await setTableOccupancy(occupyTarget.id, { occupied: true, guests });
    } finally {
      endPending(occupyTarget.id);
    }
  };

  const counts = {
    available: tables.filter(t => t.status === 'available').length,
    occupied:  tables.filter(t => t.status === 'occupied').length,
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Status counts */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg p-2 bg-emerald-500/10">
          <div className="text-lg font-bold tabular-nums text-emerald-400">{counts.available}</div>
          <div className="text-[10px] uppercase tracking-wide text-white/50 font-semibold mt-0.5">Ελεύθερα</div>
        </div>
        <div className="rounded-lg p-2 bg-red-500/10">
          <div className="text-lg font-bold tabular-nums text-red-400">{counts.occupied}</div>
          <div className="text-[10px] uppercase tracking-wide text-white/50 font-semibold mt-0.5">Κατειλημμ.</div>
        </div>
      </div>

      {/* 2-col table grid */}
      <div className="grid grid-cols-2 gap-3">
        {tables.map(t => {
          const free = t.status === 'available';
          const isPending = pending.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => handleTap(t)}
              disabled={isPending}
              className={cn(
                'relative bg-white/5 hover:bg-white/[0.07] rounded-xl p-4 border ring-2 transition-all active:scale-[0.97] text-left',
                free
                  ? 'border-emerald-500/30 ring-emerald-500/20'
                  : 'border-red-500/30 ring-red-500/20',
                isPending && 'opacity-60',
              )}
            >
              {/* Status chip */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.12em] text-white/50 font-bold">Τραπ.</span>
                <span className={cn('w-2.5 h-2.5 rounded-full', free ? 'bg-emerald-500' : 'bg-red-500')} />
              </div>

              {/* Table number */}
              <div className="text-[40px] font-extrabold leading-none tracking-tight tabular-nums text-white">
                {t.number}
              </div>

              {/* Occupancy: guests / seats */}
              <div className="flex items-center gap-1.5 mt-2 text-white/70 text-[13px] font-bold">
                <Users size={13} />
                <span className="tabular-nums">
                  {free ? `0 / ${t.seats}` : `${t.current_guests} / ${t.seats}`}
                </span>
              </div>

              {/* Status pill */}
              <div className={cn(
                'mt-3 px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-center',
                free
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400',
              )}>
                {free ? 'Ελεύθερο' : 'Κατειλημμένο'}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-white/30 pt-2">
        Πάτησε ένα τραπέζι για αλλαγή κατάστασης
      </p>

      {occupyTarget && (
        <OccupyModal
          tableNumber={occupyTarget.number}
          seats={occupyTarget.seats}
          onPick={confirmOccupy}
          onClose={() => setOccupyTarget(null)}
        />
      )}
    </div>
  );
}
