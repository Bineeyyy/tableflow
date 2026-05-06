'use client';

import { useState } from 'react';
import { Clock, Users, Phone, Check, ArrowRight, CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { seatReservation } from '@/app/actions/waiter';
import type { Reservation, Table, ReservationStatus } from '@/types';

type Filter = 'upcoming' | 'seated' | 'done';

const FILTERS: { key: Filter; label: string; statuses: ReservationStatus[] }[] = [
  { key: 'upcoming', label: 'Επερχόμενες', statuses: ['pending', 'confirmed'] },
  { key: 'seated',   label: 'Σερβίρονται', statuses: ['seated'] },
  { key: 'done',     label: 'Ολοκληρ.',     statuses: ['completed', 'cancelled'] },
];

export function ReservationsTab({
  reservations, tables,
}: { reservations: Reservation[]; tables: Table[] }) {
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tableByNumber = (id?: string) => {
    if (!id) return null;
    return tables.find(t => t.id === id) ?? null;
  };

  const active = FILTERS.find(f => f.key === filter)!;
  const visible = reservations.filter(r => active.statuses.includes(r.status));

  const handleSeat = async (reservationId: string) => {
    setPending(reservationId);
    setError(null);
    const res = await seatReservation(reservationId);
    setPending(null);
    if (res.error) setError(res.error);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Filter pills */}
      <div className="flex gap-1.5 bg-white/5 rounded-lg p-1">
        {FILTERS.map(f => {
          const count = reservations.filter(r => f.statuses.includes(r.status)).length;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'flex-1 py-2 rounded-md text-[12px] font-bold tracking-tight transition-all',
                active ? 'bg-[#F97316] text-white' : 'text-white/60',
              )}
            >
              {f.label}
              <span className={cn(
                'ml-1.5 text-[10px] px-1.5 py-0.5 rounded',
                active ? 'bg-white/25' : 'bg-white/10',
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-300 text-[12px] font-medium px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="text-center pt-12 text-white/40 flex flex-col items-center gap-2">
          <CalendarX size={32} className="text-white/20" />
          <p className="text-[13px]">Δεν υπάρχουν κρατήσεις</p>
        </div>
      )}

      {/* Reservation cards */}
      <div className="space-y-2.5">
        {visible.map(r => {
          const table = tableByNumber(r.table_id);
          const isPending = pending === r.id;
          return (
            <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-[#F97316]" />
                    <span className="text-[18px] font-extrabold tabular-nums tracking-tight">{r.time}</span>
                    {r.status === 'seated' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        Σερβίρεται
                      </span>
                    )}
                    {r.status === 'cancelled' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                        Ακυρωμένη
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] font-bold text-white truncate">{r.name}</p>
                  <div className="flex items-center gap-3 text-[12px] text-white/60 mt-1.5">
                    <span className="flex items-center gap-1"><Users size={11} />{r.guests}</span>
                    {r.phone && (
                      <a href={`tel:${r.phone}`} className="flex items-center gap-1 text-white/60 hover:text-[#F97316]">
                        <Phone size={11} />{r.phone}
                      </a>
                    )}
                    {table && (
                      <span className="text-white/60">Τραπ. {table.number}</span>
                    )}
                  </div>
                  {r.notes && (
                    <p className="text-[11px] text-white/50 mt-2 italic line-clamp-2">{r.notes}</p>
                  )}
                </div>

                {filter === 'upcoming' && (
                  <button
                    onClick={() => handleSeat(r.id)}
                    disabled={isPending}
                    className="flex items-center gap-1 bg-[#F97316] hover:bg-[#EA670D] active:scale-95 disabled:opacity-60 text-white text-[12px] font-bold px-3 py-2.5 rounded-lg transition-all"
                  >
                    {isPending ? '...' : <><Check size={14} />Καθίσμα</>}
                  </button>
                )}
                {filter === 'seated' && (
                  <span className="flex items-center gap-1 text-emerald-400 text-[12px] font-bold">
                    <ArrowRight size={14} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
