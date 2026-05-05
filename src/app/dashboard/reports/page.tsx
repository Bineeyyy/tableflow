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
      <div className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-3 md:p-6 space-y-4 md:space-y-6">

        {/* Period selector */}
        <div className="flex gap-2">
          {([
            { key: 'today', label: 'Σήμερα' },
            { key: 'week', label: 'Εβδομάδα' },
            { key: 'month', label: 'Μήνας' },
          ] as { key: Period; label: string }[]).map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={cn('px-4 py-2 rounded-lg text-[13px] font-bold transition-all',
                period === p.key
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-white text-[#0A0A0A] border border-[#E5E7EB] hover:bg-[#F8F8F8]')}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          <StatCard title="Τζίρος" value={formatCurrency(totalRevenue * multiplier)} subtitle="συνολικά έσοδα" icon={TrendingUp} trend={{ value: 15, label: 'vs προηγ.' }} />
          <StatCard title="Επισκέπτες" value={totalGuests * multiplier} subtitle="εξυπηρετηθέντες" icon={Users} trend={{ value: 8, label: 'vs προηγ.' }} />
          <StatCard title="Τραπέζια" value={`${occupied}/${mockTables.length}`} subtitle="μέσος όρος πληρότητας" icon={UtensilsCrossed} />
          <StatCard title="Μέσο ποσό" value={formatCurrency(totalRevenue / Math.max(mockOrders.length, 1))} subtitle="ανά τραπέζι" icon={Clock} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue bar chart */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-[#E5E7EB] shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[#0A0A0A] tracking-tight">Έσοδα ανά ημέρα</h3>
              <span className="text-[10px] font-bold text-[#6B7280] bg-[#F8F8F8] border border-[#E5E7EB] px-3 py-1 rounded-md uppercase tracking-wider">Τελευταίες 7 ημέρες</span>
            </div>
            <div className="flex items-end gap-3 h-44">
              {weekData.map((d, i) => {
                const height = Math.max(8, (d.revenue / maxRevenue) * 160);
                const isToday = i === weekData.length - 1;
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full flex items-end justify-center" style={{ height: 160 }}>
                      <div
                        className={cn('w-full rounded-t-md transition-all duration-300 cursor-pointer', isToday ? 'bg-[#F97316]' : 'bg-[#0A0A0A] hover:bg-[#262626]')}
                        style={{ height }}
                      />
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#0A0A0A] text-white text-[11px] font-bold px-2 py-1 rounded-md whitespace-nowrap z-10 tabular-nums">
                        {formatCurrency(d.revenue)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={cn('text-[11px] font-bold uppercase tracking-wider', isToday ? 'text-[#F97316]' : 'text-[#6B7280]')}>{d.day}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex items-center justify-between text-[12px] text-[#6B7280]">
              <span>Σύνολο εβδομάδας: <strong className="text-[#0A0A0A] font-bold tabular-nums">{formatCurrency(weekData.reduce((s, d) => s + d.revenue, 0))}</strong></span>
              <span>Καλύτερη μέρα: <strong className="text-[#F97316] font-bold">Σάββατο</strong></span>
            </div>
          </div>

          {/* Busiest hours */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-card p-6">
            <h3 className="font-bold text-[#0A0A0A] tracking-tight mb-5">Πιο Πολυάσχολες Ώρες</h3>
            <div className="space-y-2.5">
              {hourlyData.map(h => (
                <div key={h.hour} className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-[#6B7280] w-12 flex-shrink-0 tabular-nums">{h.hour}</span>
                  <div className="flex-1 h-2 bg-[#F8F8F8] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', h.pct >= 80 ? 'bg-[#F97316]' : h.pct >= 50 ? 'bg-[#FB923C]' : 'bg-[#0A0A0A]')}
                      style={{ width: `${h.pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#0A0A0A] w-8 text-right tabular-nums">{h.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table utilization */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-card p-6">
          <h3 className="font-bold text-[#0A0A0A] tracking-tight mb-5">Πληρότητα Τραπεζιών</h3>
          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13 gap-3">
            {mockTables.map(table => {
              const utilPct = Math.floor(Math.random() * 60 + 30);
              return (
                <div key={table.id} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                  <div className="relative w-full aspect-square rounded-md overflow-hidden bg-[#F8F8F8] border border-[#E5E7EB]">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-[#F97316] transition-all"
                      style={{ height: `${utilPct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-[#0A0A0A] mix-blend-multiply">#{table.number}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#6B7280] tabular-nums">{utilPct}%</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#E5E7EB]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#F97316]" /><span className="text-[12px] font-medium text-[#6B7280]">Πληρότητα</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#F8F8F8] border border-[#E5E7EB]" /><span className="text-[12px] font-medium text-[#6B7280]">Αδρανές</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
