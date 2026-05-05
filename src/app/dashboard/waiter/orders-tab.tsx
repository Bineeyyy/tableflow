'use client';

import { Users, ClipboardList, Clock } from 'lucide-react';
import { closeOrder } from '@/lib/supabase/queries';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Table } from '@/types';
import type { Tables } from '@/types/database.types';

type DbOrder = Tables<'orders'>;

function elapsed(opened: string): string {
  const ms = Date.now() - new Date(opened).getTime();
  const min = Math.max(0, Math.floor(ms / 60000));
  if (min < 60) return `${min}'`;
  return `${Math.floor(min / 60)}h ${min % 60}'`;
}

export function OrdersTab({ orders, tables }: { orders: DbOrder[]; tables: Table[] }) {
  const [closing, setClosing] = useState<string | null>(null);
  const tableMap = new Map(tables.map(t => [t.id, t]));

  if (orders.length === 0) {
    return (
      <div className="px-5 pt-12 text-center text-white/40 flex flex-col items-center gap-2">
        <ClipboardList size={32} className="text-white/20" />
        <p className="text-[13px]">Καμία ανοιχτή παραγγελία</p>
      </div>
    );
  }

  const handleClose = async (orderId: string) => {
    setClosing(orderId);
    try {
      await closeOrder(orderId);
    } catch (err) {
      console.error('[waiter] close order failed', err);
    } finally {
      setClosing(null);
    }
  };

  const total = orders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-[#F97316]/10 border border-[#F97316]/30 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-white/50">Ανοιχτές</p>
          <p className="text-[20px] font-extrabold text-white">{orders.length}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider font-bold text-white/50">Σύνολο</p>
          <p className="text-[20px] font-extrabold text-[#F97316] tabular-nums">{total.toFixed(2)}€</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {orders.map(o => {
          const t = o.table_id ? tableMap.get(o.table_id) : null;
          const isClosing = closing === o.id;
          return (
            <div key={o.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#F97316]/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[20px] font-extrabold text-[#F97316] tabular-nums">{t?.number ?? '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 text-[12px] text-white/60">
                  <span className="flex items-center gap-1"><Users size={11} />{o.guests}</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{elapsed(o.opened_at)}</span>
                </div>
                <p className="text-[16px] font-extrabold text-white tabular-nums mt-0.5">
                  {Number(o.total).toFixed(2)}€
                </p>
              </div>
              <button
                onClick={() => handleClose(o.id)}
                disabled={isClosing}
                className={cn(
                  'text-[11px] font-bold px-3 py-2 rounded-md transition-all active:scale-95',
                  'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30',
                  isClosing && 'opacity-60',
                )}
              >
                {isClosing ? '...' : 'Κλείσιμο'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
