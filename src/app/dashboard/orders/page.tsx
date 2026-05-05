'use client';

import { useState } from 'react';
import { TopBar } from '@/components/ui/topbar';
import { StatCard } from '@/components/ui/stat-card';
import { mockOrders, mockTables, getElapsedMinutes } from '@/lib/mock-data';
import { formatCurrency, cn } from '@/lib/utils';
import { Order } from '@/types';
import { UtensilsCrossed, Users, Clock, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  const closeOrder = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'closed' as const, closed_at: new Date().toISOString() } : o));
  };

  const open = orders.filter(o => o.status === 'open');
  const closed = orders.filter(o => o.status === 'closed');
  const totalRevenue = open.reduce((s, o) => s + o.total, 0);
  const totalGuests = open.reduce((s, o) => s + o.guests, 0);
  const avgTime = open.length > 0
    ? Math.round(open.reduce((s, o) => s + getElapsedMinutes(o.created_at), 0) / open.length)
    : 0;

  const getTable = (tableId: string) => mockTables.find(t => t.id === tableId);

  return (
    <>
      <TopBar title="Παραγγελίες" subtitle="Ενεργές παραγγελίες τραπεζιών" />
      <div className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-3 md:p-6 space-y-4 md:space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          <StatCard title="Ενεργές" value={open.length} subtitle="ανοιχτές παραγγελίες" icon={UtensilsCrossed} />
          <StatCard title="Σύνολο" value={formatCurrency(totalRevenue)} subtitle="τρέχων τζίρος" icon={TrendingUp} />
          <StatCard title="Επισκέπτες" value={totalGuests} subtitle="άτομα εξυπηρετούνται" icon={Users} />
          <StatCard title="Μέσος Χρόνος" value={`${avgTime} λεπτά`} subtitle="ανά τραπέζι" icon={Clock} />
        </div>

        {/* Orders list */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h3 className="font-bold text-[#0A0A0A] tracking-tight">Ανοιχτές Παραγγελίες</h3>
            <span className="text-[11px] font-bold text-[#F97316] bg-[#F97316]/10 px-2.5 py-1 rounded-md uppercase tracking-wider">{open.length} ενεργές</span>
          </div>

          {open.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle size={40} className="mx-auto text-[#10B981] mb-3" />
              <p className="text-[#0A0A0A] font-bold tracking-tight">Δεν υπάρχουν ενεργές παραγγελίες</p>
              <p className="text-[#6B7280] text-[13px] mt-1">Όλα τα τραπέζια είναι ελεύθερα</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {open
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map(order => {
                  const table = getTable(order.table_id);
                  const elapsed = getElapsedMinutes(order.created_at);
                  const isLong = elapsed > 60;
                  return (
                    <div key={order.id} className="px-6 py-4 hover:bg-[#F8F8F8] transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Table badge */}
                        <div className={cn(
                          'w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 font-bold',
                          isLong ? 'bg-[#EF4444]/10 text-[#B91C1C]' : 'bg-[#F97316]/10 text-[#F97316]'
                        )}>
                          <span className="text-[10px] leading-none uppercase tracking-wider">Τρ.</span>
                          <span className="text-lg leading-tight">{table?.number}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#0A0A0A] tracking-tight">Τραπέζι {table?.number}</span>
                            {table?.label && (
                              <span className="text-[10px] bg-[#F97316]/10 text-[#C2410C] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">{table.label}</span>
                            )}
                            {isLong && (
                              <span className="flex items-center gap-1 text-[11px] text-[#EF4444] font-bold uppercase tracking-wide">
                                <AlertCircle size={12} /> Μεγάλη αναμονή
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-[13px] text-[#6B7280]">
                            <span className="flex items-center gap-1">
                              <Users size={13} /> {order.guests} άτομα
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={13} />
                              <span className={isLong ? 'text-[#EF4444] font-semibold' : ''}>{elapsed} λεπτά</span>
                            </span>
                            {order.notes && (
                              <span className="truncate max-w-[200px] text-[#9CA3AF] italic">&ldquo;{order.notes}&rdquo;</span>
                            )}
                          </div>
                        </div>

                        {/* Total */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-extrabold text-[#0A0A0A] tracking-tight tabular-nums">{formatCurrency(order.total)}</div>
                          <div className="text-[10px] text-[#6B7280] mt-0.5 uppercase tracking-wider font-semibold">σύνολο</div>
                        </div>

                        {/* Action */}
                        <button
                          onClick={() => closeOrder(order.id)}
                          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#0A0A0A] hover:bg-black text-white text-[13px] font-bold rounded-lg transition-colors active:scale-[0.98]"
                        >
                          <CheckCircle size={14} strokeWidth={2.6} />
                          Κλείσιμο
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Closed orders today */}
        {closed.length > 0 && (
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="font-bold text-[#0A0A0A] tracking-tight">Κλειστές Παραγγελίες Σήμερα</h3>
              <span className="text-[11px] font-bold text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
                {formatCurrency(closed.reduce((s, o) => s + o.total, 0))} σύνολο
              </span>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {closed.map(order => {
                const table = getTable(order.table_id);
                return (
                  <div key={order.id} className="px-6 py-3 flex items-center gap-4 opacity-60">
                    <div className="w-10 h-10 rounded-md bg-[#F8F8F8] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] font-bold text-sm flex-shrink-0">
                      {table?.number}
                    </div>
                    <div className="flex-1">
                      <span className="text-[13px] font-medium text-[#0A0A0A]">Τραπέζι {table?.number}</span>
                      <span className="text-[12px] text-[#6B7280] ml-2">· {order.guests} άτομα</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-[#10B981]" />
                      <span className="font-bold text-[#0A0A0A] tabular-nums">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
