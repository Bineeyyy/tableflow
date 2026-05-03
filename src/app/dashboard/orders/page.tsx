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
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Ενεργές" value={open.length} subtitle="ανοιχτές παραγγελίες" icon={UtensilsCrossed} iconColor="text-terracotta" />
          <StatCard title="Σύνολο" value={formatCurrency(totalRevenue)} subtitle="τρέχων τζίρος" icon={TrendingUp} iconColor="text-emerald-600" />
          <StatCard title="Επισκέπτες" value={totalGuests} subtitle="άτομα εξυπηρετούνται" icon={Users} iconColor="text-sky-500" />
          <StatCard title="Μέσος Χρόνος" value={`${avgTime} λεπτά`} subtitle="ανά τραπέζι" icon={Clock} iconColor="text-amber-500" />
        </div>

        {/* Orders list */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Ανοιχτές Παραγγελίες</h3>
            <span className="text-xs text-stone-400 bg-stone-100 px-2.5 py-1 rounded-full">{open.length} ενεργές</span>
          </div>

          {open.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle size={40} className="mx-auto text-emerald-300 mb-3" />
              <p className="text-stone-500 font-medium">Δεν υπάρχουν ενεργές παραγγελίες</p>
              <p className="text-stone-400 text-sm mt-1">Όλα τα τραπέζια είναι ελεύθερα</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-50">
              {open
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map(order => {
                  const table = getTable(order.table_id);
                  const elapsed = getElapsedMinutes(order.created_at);
                  const isLong = elapsed > 60;
                  return (
                    <div key={order.id} className="px-6 py-4 hover:bg-stone-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Table badge */}
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold',
                          isLong ? 'bg-red-50 text-red-600' : 'bg-terracotta/10 text-terracotta'
                        )}>
                          <span className="text-xs leading-none">Τρ.</span>
                          <span className="text-lg leading-tight">{table?.number}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-800">Τραπέζι {table?.number}</span>
                            {table?.label && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{table.label}</span>
                            )}
                            {isLong && (
                              <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                                <AlertCircle size={12} /> Μεγάλη αναμονή
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-stone-500">
                            <span className="flex items-center gap-1">
                              <Users size={13} /> {order.guests} άτομα
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={13} />
                              <span className={isLong ? 'text-red-500 font-medium' : ''}>{elapsed} λεπτά</span>
                            </span>
                            {order.notes && (
                              <span className="truncate max-w-[200px] text-stone-400 italic">"{order.notes}"</span>
                            )}
                          </div>
                        </div>

                        {/* Total */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold text-stone-900">{formatCurrency(order.total)}</div>
                          <div className="text-xs text-stone-400 mt-0.5">σύνολο</div>
                        </div>

                        {/* Action */}
                        <button
                          onClick={() => closeOrder(order.id)}
                          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors active:scale-95"
                        >
                          <CheckCircle size={14} />
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
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-800">Κλειστές Παραγγελίες Σήμερα</h3>
              <span className="text-xs text-stone-400 bg-stone-100 px-2.5 py-1 rounded-full">
                {formatCurrency(closed.reduce((s, o) => s + o.total, 0))} σύνολο
              </span>
            </div>
            <div className="divide-y divide-stone-50">
              {closed.map(order => {
                const table = getTable(order.table_id);
                return (
                  <div key={order.id} className="px-6 py-3 flex items-center gap-4 opacity-60">
                    <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 font-bold text-sm flex-shrink-0">
                      {table?.number}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-stone-600">Τραπέζι {table?.number}</span>
                      <span className="text-xs text-stone-400 ml-2">· {order.guests} άτομα</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-500" />
                      <span className="font-semibold text-stone-700">{formatCurrency(order.total)}</span>
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
