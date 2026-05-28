import Link from 'next/link';
import { TopBar } from '@/components/ui/topbar';
import { StatCard } from '@/components/ui/stat-card';
import { cn } from '@/lib/utils';
import {
  getMyRestaurant,
  getTablesForRestaurant,
  getReservationsForRestaurant,
  getWalkinsForRestaurantInRange,
} from '@/lib/supabase/server-queries';
import { CalendarCheck, Users, UtensilsCrossed, TrendingUp } from 'lucide-react';
import type { Reservation } from '@/types';

type Period = 'today' | 'week' | 'month';

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: 'today', label: 'Σήμερα',    days: 1  },
  { key: 'week',  label: 'Εβδομάδα',  days: 7  },
  { key: 'month', label: 'Μήνας',     days: 30 },
];

const WEEKDAY_SHORT = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function periodRange(period: Period): { startIso: string; endIso: string; days: number } {
  const days = PERIODS.find(p => p.key === period)?.days ?? 1;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { startIso: toIsoDate(start), endIso: toIsoDate(end), days };
}

export default async function ReportsPage(props: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await props.searchParams;
  const period: Period = (PERIODS.find(p => p.key === periodParam)?.key ?? 'today');

  const restaurant = await getMyRestaurant();

  if (!restaurant) {
    return (
      <>
        <TopBar title="Αναφορές" subtitle="Στατιστικά & αναλυτικά στοιχεία" />
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-[#6B7280] text-sm">Δεν υπάρχει εστιατόριο για να εμφανιστούν αναφορές.</p>
        </div>
      </>
    );
  }

  const { startIso, endIso, days } = periodRange(period);

  const [tables, allReservations, walkins] = await Promise.all([
    getTablesForRestaurant(restaurant.id),
    getReservationsForRestaurant(restaurant.id),
    getWalkinsForRestaurantInRange(restaurant.id, startIso, endIso),
  ]);

  const inPeriod = (r: Reservation) => r.date >= startIso && r.date <= endIso;
  const isActive = (r: Reservation) => r.status !== 'cancelled';

  const periodReservations = allReservations.filter(inPeriod);
  const activeReservations = periodReservations.filter(isActive);

  // Reports show "every activity in the room" — both reservation guests and
  // walk-in parties contribute to occupancy, guest counts, and busy-hour
  // breakdowns. Walk-ins live in their own table; we fold them in at the
  // aggregation step rather than as synthetic Reservation rows so the
  // reservations list stays clean.
  const walkinGuestSum = walkins.reduce((s, w) => s + w.party_size, 0);
  const reservationGuestSum = activeReservations.reduce((s, r) => s + r.guests, 0);

  const totalGuests       = reservationGuestSum + walkinGuestSum;
  const reservationCount  = activeReservations.length;
  const walkinCount       = walkins.length;
  const activityCount     = reservationCount + walkinCount;
  const avgPartySize      = activityCount > 0
    ? Math.round((totalGuests / activityCount) * 10) / 10
    : 0;

  // Πληρότητα: avg activity (reservations + walk-ins) per day vs total tables,
  // capped at 100%.
  const tablesCount = Math.max(tables.length, 1);
  const avgPerDay = activityCount / days;
  const occupancyPct = Math.min(100, Math.round((avgPerDay / tablesCount) * 100));

  // Activity per day — last 7 days within the selected period (or fewer for "today").
  const chartDays = Math.min(7, days);
  const dayBuckets: { iso: string; date: Date; count: number; guests: number }[] = [];
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayBuckets.push({ iso: toIsoDate(d), date: d, count: 0, guests: 0 });
  }
  for (const r of activeReservations) {
    const bucket = dayBuckets.find(b => b.iso === r.date);
    if (bucket) {
      bucket.count += 1;
      bucket.guests += r.guests;
    }
  }
  for (const w of walkins) {
    const iso = w.occurred_at.slice(0, 10);
    const bucket = dayBuckets.find(b => b.iso === iso);
    if (bucket) {
      bucket.count += 1;
      bucket.guests += w.party_size;
    }
  }
  const maxDayCount = Math.max(1, ...dayBuckets.map(b => b.count));

  // Busiest hours — combine reservation reserved_time and walk-in occurred_at hour.
  const hourBuckets = new Map<number, number>();
  for (let h = 12; h <= 23; h++) hourBuckets.set(h, 0);
  for (const r of activeReservations) {
    const hour = parseInt(r.time.slice(0, 2), 10);
    if (hourBuckets.has(hour)) {
      hourBuckets.set(hour, (hourBuckets.get(hour) ?? 0) + 1);
    }
  }
  for (const w of walkins) {
    const hour = new Date(w.occurred_at).getHours();
    if (hourBuckets.has(hour)) {
      hourBuckets.set(hour, (hourBuckets.get(hour) ?? 0) + 1);
    }
  }
  const maxHour = Math.max(1, ...Array.from(hourBuckets.values()));

  // Status breakdown (reservations only — walk-ins have no status).
  const statusCount = {
    confirmed: periodReservations.filter(r => r.status === 'confirmed').length,
    pending:   periodReservations.filter(r => r.status === 'pending').length,
    seated:    periodReservations.filter(r => r.status === 'seated').length,
    completed: periodReservations.filter(r => r.status === 'completed').length,
    cancelled: periodReservations.filter(r => r.status === 'cancelled').length,
  };
  const totalForStatus = Math.max(1, periodReservations.length);

  // Per-table activity counts — count both reservations and walk-ins so a
  // table that hosts mostly walk-ins still scores on the heatmap.
  const tableCounts = tables.map(t => ({
    table: t,
    count:
      activeReservations.filter(r => r.table_id === t.id).length +
      walkins.filter(w => w.table_id === t.id).length,
  }));
  const maxTableCount = Math.max(1, ...tableCounts.map(t => t.count));

  return (
    <>
      <TopBar title="Αναφορές" subtitle="Στατιστικά & αναλυτικά στοιχεία" />
      <div className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-3 md:p-6 space-y-4 md:space-y-6">

        {/* Period selector */}
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <Link
              key={p.key}
              href={`/dashboard/reports?period=${p.key}`}
              className={cn('px-4 py-2 rounded-lg text-[13px] font-bold transition-all',
                period === p.key
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-white text-[#0A0A0A] border border-[#E5E7EB] hover:bg-[#F8F8F8]')}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          <StatCard
            title="Πληρότητα"
            value={`${occupancyPct}%`}
            subtitle={`μέσος όρος / ${days === 1 ? 'σήμερα' : `${days} ημέρες`}`}
            icon={TrendingUp}
          />
          <StatCard
            title="Επισκέπτες"
            value={totalGuests}
            subtitle="συνολικά άτομα"
            icon={Users}
          />
          <StatCard
            title="Δραστηριότητα"
            value={activityCount}
            subtitle={`${reservationCount} κρατήσεις · ${walkinCount} walk-in`}
            icon={CalendarCheck}
          />
          <StatCard
            title="Μέσος όρος"
            value={avgPartySize}
            subtitle="άτομα ανά τραπέζι"
            icon={UtensilsCrossed}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity per day chart */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-[#E5E7EB] shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[#0A0A0A] tracking-tight">Δραστηριότητα ανά ημέρα</h3>
              <span className="text-[10px] font-bold text-[#6B7280] bg-[#F8F8F8] border border-[#E5E7EB] px-3 py-1 rounded-md uppercase tracking-wider">
                Τελευταίες {chartDays} {chartDays === 1 ? 'ημέρα' : 'ημέρες'}
              </span>
            </div>
            <div className="flex items-end gap-3 h-44">
              {dayBuckets.map((b, i) => {
                const height = Math.max(8, (b.count / maxDayCount) * 160);
                const isToday = i === dayBuckets.length - 1;
                const label = WEEKDAY_SHORT[b.date.getDay()];
                return (
                  <div key={b.iso} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full flex items-end justify-center" style={{ height: 160 }}>
                      <div
                        className={cn('w-full rounded-t-md transition-all duration-300 cursor-pointer', isToday ? 'bg-[#F97316]' : 'bg-[#0A0A0A] hover:bg-[#262626]')}
                        style={{ height }}
                      />
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#0A0A0A] text-white text-[11px] font-bold px-2 py-1 rounded-md whitespace-nowrap z-10 tabular-nums">
                        {b.count} ενεργ. · {b.guests} άτ.
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={cn('text-[11px] font-bold uppercase tracking-wider', isToday ? 'text-[#F97316]' : 'text-[#6B7280]')}>{label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex items-center justify-between text-[12px] text-[#6B7280]">
              <span>Σύνολο: <strong className="text-[#0A0A0A] font-bold tabular-nums">{dayBuckets.reduce((s, b) => s + b.count, 0)} ενέργειες</strong></span>
              <span>Επισκέπτες: <strong className="text-[#F97316] font-bold tabular-nums">{dayBuckets.reduce((s, b) => s + b.guests, 0)} άτομα</strong></span>
            </div>
          </div>

          {/* Busiest hours */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-card p-6">
            <h3 className="font-bold text-[#0A0A0A] tracking-tight mb-5">Πιο Πολυάσχολες Ώρες</h3>
            <div className="space-y-2.5">
              {Array.from(hourBuckets.entries()).map(([hour, count]) => {
                const pct = Math.round((count / maxHour) * 100);
                return (
                  <div key={hour} className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-[#6B7280] w-12 flex-shrink-0 tabular-nums">{`${String(hour).padStart(2, '0')}:00`}</span>
                    <div className="flex-1 h-2 bg-[#F8F8F8] rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', pct >= 80 ? 'bg-[#F97316]' : pct >= 50 ? 'bg-[#FB923C]' : 'bg-[#0A0A0A]')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#0A0A0A] w-8 text-right tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-[#0A0A0A] tracking-tight">Κατάσταση Κρατήσεων</h3>
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
              + {walkinCount} walk-in (χωρίς κατάσταση)
            </span>
          </div>
          {periodReservations.length === 0 ? (
            <p className="text-[12px] text-[#6B7280]">Δεν υπάρχουν κρατήσεις στο επιλεγμένο διάστημα.</p>
          ) : (
            <>
              <div className="flex h-3 rounded-full overflow-hidden bg-[#F8F8F8]">
                {([
                  { key: 'confirmed', count: statusCount.confirmed, color: '#10B981' },
                  { key: 'completed', count: statusCount.completed, color: '#0A0A0A' },
                  { key: 'cancelled', count: statusCount.cancelled, color: '#D1D5DB' },
                ] as const).map(s => (
                  s.count > 0 ? (
                    <div
                      key={s.key}
                      style={{ width: `${(s.count / totalForStatus) * 100}%`, background: s.color }}
                      title={`${s.key}: ${s.count}`}
                    />
                  ) : null
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Επιβεβαιωμένες', count: statusCount.confirmed, color: '#10B981' },
                  { label: 'Ολοκληρωμένες',  count: statusCount.completed, color: '#0A0A0A' },
                  { label: 'Ακυρωμένες',     count: statusCount.cancelled, color: '#D1D5DB' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-[#0A0A0A] truncate">{s.label}</div>
                      <div className="text-[12px] text-[#6B7280] tabular-nums">{s.count}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Activity per table */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-card p-6">
          <h3 className="font-bold text-[#0A0A0A] tracking-tight mb-5">Δραστηριότητα ανά Τραπέζι</h3>
          {tables.length === 0 ? (
            <p className="text-[12px] text-[#6B7280]">Δεν έχουν προστεθεί τραπέζια.</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13 gap-3">
              {tableCounts.map(({ table, count }) => {
                const fillPct = Math.round((count / maxTableCount) * 100);
                return (
                  <div key={table.id} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                    <div className="relative w-full aspect-square rounded-md overflow-hidden bg-[#F8F8F8] border border-[#E5E7EB]">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-[#F97316] transition-all"
                        style={{ height: `${fillPct}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-[#0A0A0A] mix-blend-multiply">#{table.number}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#6B7280] tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#E5E7EB]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#F97316]" /><span className="text-[12px] font-medium text-[#6B7280]">Κρατήσεις + walk-in</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#F8F8F8] border border-[#E5E7EB]" /><span className="text-[12px] font-medium text-[#6B7280]">Χωρίς</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
