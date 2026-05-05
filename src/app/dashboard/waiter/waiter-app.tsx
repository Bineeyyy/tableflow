'use client';

import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, CalendarDays, ClipboardList, User, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Table, Reservation } from '@/types';
import type { Tables } from '@/types/database.types';
import { FloorTab } from './floor-tab';
import { ReservationsTab } from './reservations-tab';
import { OrdersTab } from './orders-tab';
import { ProfileTab } from './profile-tab';
import { WalkinModal } from './walkin-modal';

type DbOrder = Tables<'orders'>;
type DbTable = Tables<'restaurant_tables'>;
type DbReservation = Tables<'reservations'>;

type Tab = 'floor' | 'reservations' | 'orders' | 'profile';

const NAV: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'floor',        label: 'Κάτοψη',      icon: LayoutGrid },
  { key: 'reservations', label: 'Κρατήσεις',   icon: CalendarDays },
  { key: 'orders',       label: 'Παραγγελίες', icon: ClipboardList },
  { key: 'profile',      label: 'Προφίλ',      icon: User },
];

function mapTable(t: DbTable): Table {
  return {
    id: t.id, number: t.number, seats: t.seats, current_guests: t.current_guests,
    status: t.status, x: t.pos_x, y: t.pos_y, shape: t.shape, label: t.label ?? undefined,
  };
}

function mapReservation(r: DbReservation): Reservation {
  return {
    id: r.id, name: r.customer_name, phone: r.customer_phone ?? '',
    date: r.reserved_date, time: r.reserved_time.slice(0, 5),
    guests: r.party_size, table_id: r.table_id ?? undefined,
    status: r.status, notes: r.notes ?? '', created_at: r.created_at,
  };
}

type Props = {
  restaurantId: string;
  restaurantName: string;
  initialTables: Table[];
  initialReservations: Reservation[];
  initialOpenOrders: DbOrder[];
  userEmail: string;
};

export function WaiterApp({
  restaurantId, restaurantName,
  initialTables, initialReservations, initialOpenOrders, userEmail,
}: Props) {
  const [tab, setTab] = useState<Tab>('floor');
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [orders, setOrders] = useState<DbOrder[]>(initialOpenOrders);
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [live, setLive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const knownReservationIds = useRef(new Set(initialReservations.map(r => r.id)));

  // Real-time: subscribe to restaurant-scoped changes on tables + reservations.
  // The supabase publication is filtered server-side via RLS so other
  // restaurants' rows never reach this client.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`waiter:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_tables', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id?: string }).id;
            if (id) setTables(prev => prev.filter(t => t.id !== id));
          } else {
            const row = mapTable(payload.new as DbTable);
            setTables(prev => {
              const idx = prev.findIndex(t => t.id === row.id);
              if (idx === -1) return [...prev, row].sort((a, b) => a.number - b.number);
              const next = prev.slice(); next[idx] = row; return next;
            });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id?: string }).id;
            if (id) setReservations(prev => prev.filter(r => r.id !== id));
            return;
          }
          const row = mapReservation(payload.new as DbReservation);
          // Only show today's reservations in the waiter view.
          const today = new Date().toISOString().split('T')[0];
          if (row.date !== today) return;

          const isNew = !knownReservationIds.current.has(row.id);
          knownReservationIds.current.add(row.id);

          setReservations(prev => {
            const idx = prev.findIndex(r => r.id === row.id);
            if (idx === -1) return [...prev, row].sort((a, b) => a.time.localeCompare(b.time));
            const next = prev.slice(); next[idx] = row; return next;
          });

          if (isNew && payload.eventType === 'INSERT') {
            setToast(`📣 Νέα κράτηση: ${row.name} · ${row.guests} άτομα · ${row.time}`);
            setTimeout(() => setToast(null), 4000);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id?: string }).id;
            if (id) setOrders(prev => prev.filter(o => o.id !== id));
            return;
          }
          const row = payload.new as DbOrder;
          setOrders(prev => {
            const idx = prev.findIndex(o => o.id === row.id);
            // Drop closed/cancelled orders from the open list.
            if (row.status !== 'open') {
              if (idx === -1) return prev;
              return prev.filter(o => o.id !== row.id);
            }
            if (idx === -1) return [...prev, row];
            const next = prev.slice(); next[idx] = row; return next;
          });
        },
      )
      .subscribe(status => setLive(status === 'SUBSCRIBED'));

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  return (
    <div className="h-full w-full flex justify-center bg-[#0A0A0A] text-white">
      {/* Phone-shaped column — caps at 390px on tablet/desktop. */}
      <div className="relative w-full max-w-[390px] h-full flex flex-col">

        {/* Top header */}
        <header className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/40">Waiter</p>
            <h1 className="text-[16px] font-bold tracking-tight truncate max-w-[240px]">{restaurantName}</h1>
          </div>
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide',
            live ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/40',
          )}>
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              live ? 'bg-emerald-400 animate-pulse' : 'bg-white/30',
            )} />
            {live ? 'Ζωντανό' : 'Σύνδεση...'}
          </div>
        </header>

        {/* Active tab content */}
        <main className="flex-1 overflow-y-auto pb-24">
          {tab === 'floor' && <FloorTab tables={tables} />}
          {tab === 'reservations' && <ReservationsTab reservations={reservations} tables={tables} />}
          {tab === 'orders' && <OrdersTab orders={orders} tables={tables} />}
          {tab === 'profile' && <ProfileTab userEmail={userEmail} restaurantName={restaurantName} />}
        </main>

        {/* Toast for new reservations */}
        {toast && (
          <div className="absolute left-3 right-3 top-20 bg-[#F97316] text-white text-[13px] font-semibold px-4 py-3 rounded-xl shadow-2xl shadow-[#F97316]/40 flex items-start gap-2 animate-in slide-in-from-top duration-300">
            <span className="flex-1">{toast}</span>
            <button onClick={() => setToast(null)} className="text-white/80 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Floating action button: walk-in */}
        <button
          onClick={() => setWalkinOpen(true)}
          aria-label="Νέα παραγγελία (walk-in)"
          className="absolute bottom-24 right-5 w-14 h-14 rounded-full bg-[#F97316] hover:bg-[#EA670D] active:scale-95 transition-all shadow-2xl shadow-[#F97316]/50 flex items-center justify-center text-white"
        >
          <Plus size={26} strokeWidth={2.6} />
        </button>

        {/* Bottom nav */}
        <nav className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-white/10 flex items-stretch h-20 pb-[env(safe-area-inset-bottom)]">
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
                  active ? 'text-[#F97316]' : 'text-white/50 hover:text-white/80',
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                <span className="text-[10px] font-bold tracking-wide">{label}</span>
              </button>
            );
          })}
        </nav>

        {walkinOpen && (
          <WalkinModal
            onClose={() => setWalkinOpen(false)}
            onSeated={(tableNumber) => {
              setToast(`✓ Καθίσμα στο τραπέζι ${tableNumber}`);
              setTimeout(() => setToast(null), 3000);
              setWalkinOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
