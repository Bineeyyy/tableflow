'use client';

import { useState } from 'react';
import { TopBar } from '@/components/ui/topbar';
import { StatCard } from '@/components/ui/stat-card';
import { mockTables, mockOrders } from '@/lib/mock-data';
import { formatCurrency, cn } from '@/lib/utils';
import { TrendingUp, Users, UtensilsCrossed, Clock } from 'lucide-react';

type Period = 'today' | 'week' | 'month';

const weekData = [
  { day: 'Δευ', revenue: 245, covers: 28 },
  { day: 'Τρι', revenue: 312, covers: 35 },
  { day: 'Τετ', revenue: 189, covers: 22 },
  { day: 'Πεμ', revenue: 420, covers: 48 },
  { day: 'Παρ', revenue: 515, covers: 58 },
  { day: 'Σαβ', revenue: 680, covers: 74 },
  { day: 'Κυρ', revenue: 293, covers: 34 },
];

const hourlyData = [
  { hour: '12:00', pct: 20 }, { hour: '13:00', pct: 65 }, { hour: '14:00', pct: 90 },
  { hour: '15:00', pct: 40 }, { hour: '16:00', pct: 15 }, { hour: '17:00', pct: 10 },
  { hour: '18:00', pct: 30 }, { hour: '19:00', pct: 70 }, { hour: '20:00', pct: 100 },
  { hour: '21:00', pct: 95 }, { hour: '22:00', pct: 75 }, { hour: '23:00', pct: 45 },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('today');

  const totalRevenue = mockOrders.reduce((s, o) => s + o.total, 0);
  const totalGuests = mockOrders.reduce((s, o) => s + o.guests, 0);
  const occupied = mockTables.filter(t => t.status === 'occupied').length;
  const maxRevenue = Math.max(...weekData.map(d => d.revenue));

  const multiplier = period === 'today' ? 1 : period === 'week' ? 7 : 30;

  return (
    <>
      <TopBar title="Αναφορές" subtitle="Στατιστικά & αναλυτικά στοιχεία" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Period selector */}
        <div className="flex gap-2">
          {([
            { key: 'today', label: 'Σήμερα' },
            { key: 'week', label: 'Εβδομάδα' },
            { key: 'month', label: 'Μήνας' },
          ] as { key: Period; label: string }[]).map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all',
                period === p.key
                  ? 'bg-terracotta text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50')}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Τζίρος" value={formatCurrency(totalRevenue * multiplier)} subtitle="συνολικά έσοδα" icon={TrendingUp} iconColor="text-terracotta" trend={{ value: 15, label: 'vs προηγ.' }} />
          <StatCard title="Επισκέπτες" value={totalGuests * multiplier} subtitle="εξυπηρετηθέντες" icon={Users} iconColor="text-sky-500" trend={{ value: 8, label: 'vs προηγ.' }} />
          <StatCard title="Τραπέζια" value={`${occupied}/${mockTables.length}`} subtitle="μέσος όρος πληρότητας" icon={UtensilsCrossed} iconColor="text-amber-500" />
          <StatCard title="Μέσο ποσό" value={formatCurrency(totalRevenue / Math.max(mockOrders.length, 1))} subtitle="ανά τραπέζι" icon={Clock} iconColor="text-emerald-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue bar chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-stone-800">Έσοδα ανά ημέρα</h3>
              <span className="text-xs text-stone-400 bg-stone-100 px-3 py-1 rounded-full">Τελευταίες 7 ημέρες</span>
            </div>
            <div className="flex items-end gap-3 h-44">
              {weekData.map((d, i) => {
                const height = Math.max(8, (d.revenue / maxRevenue) * 160);
                const isToday = i === weekData.length - 1;
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full flex items-end justify-center" style={{ height: 160 }}>
                      <div
                        className={cn('w-full rounded-t-lg transition-all duration-300 cursor-pointer group-hover:opacity-90', isToday ? 'bg-terracotta' : 'bg-terracotta/30 hover:bg-terracotta/50')}
                        style={{ height }}
                      />
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-stone-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap z-10">
                        {formatCurrency(d.revenue)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={cn('text-xs font-medium', isToday ? 'text-terracotta' : 'text-stone-400')}>{d.day}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
              <span>Σύνολο εβδομάδας: <strong className="text-stone-700">{formatCurrency(weekData.reduce((s, d) => s + d.revenue, 0))}</strong></span>
              <span>Καλύτερη μέρα: <strong className="text-terracotta">Σάββατο</strong></span>
            </div>
          </div>

          {/* Busiest hours */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
            <h3 className="font-semibold text-stone-800 mb-5">Πιο Πολυάσχολες Ώρες</h3>
            <div className="space-y-2.5">
              {hourlyData.map(h => (
                <div key={h.hour} className="flex items-center gap-3">
                  <span className="text-xs text-stone-400 w-12 flex-shrink-0">{h.hour}</span>
                  <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', h.pct >= 80 ? 'bg-terracotta' : h.pct >= 50 ? 'bg-terracotta/60' : 'bg-terracotta/30')}
                      style={{ width: `${h.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-400 w-8 text-right">{h.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table utilization */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <h3 className="font-semibold text-stone-800 mb-5">Πληρότητα Τραπεζιών</h3>
          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13 gap-3">
            {mockTables.map(table => {
              const utilPct = Math.floor(Math.random() * 60 + 30);
              return (
                <div key={table.id} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-stone-100">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-terracotta/70 transition-all"
                      style={{ height: `${utilPct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-stone-700 mix-blend-multiply">#{table.number}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-stone-400">{utilPct}%</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-stone-100">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-terracotta/70" /><span className="text-xs text-stone-500">Πληρότητα</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-stone-100" /><span className="text-xs text-stone-500">Αδρανές</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
