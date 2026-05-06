'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X, Search, UtensilsCrossed, CalendarDays, Loader2, Users, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database.types';
import { getStatusLabel, cn } from '@/lib/utils';

type DbTable = Tables<'restaurant_tables'>;
type DbReservation = Tables<'reservations'>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchDrawer({ isOpen, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [tables, setTables] = useState<DbTable[]>([]);
  const [reservations, setReservations] = useState<DbReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset the query when the drawer transitions from open → closed.
  // React 19 "adjust state during render" pattern — preferred over an
  // effect that calls setState, per react-hooks/set-state-in-effect.
  const [trackedOpen, setTrackedOpen] = useState(isOpen);
  if (trackedOpen !== isOpen) {
    setTrackedOpen(isOpen);
    if (!isOpen && query !== '') setQuery('');
  }

  // Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Autofocus input on open
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  // Lazy fetch on first open. RLS restricts to current user's restaurants.
  useEffect(() => {
    if (!isOpen || loaded) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sb = createClient();
        const [tRes, rRes] = await Promise.all([
          sb.from('restaurant_tables').select('*').order('number').limit(200),
          sb.from('reservations').select('*').order('reserved_date', { ascending: false }).limit(200),
        ]);
        if (cancelled) return;
        setTables(tRes.data ?? []);
        setReservations(rRes.data ?? []);
        setLoaded(true);
      } catch (err) {
        console.error('[search] fetch failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, loaded]);

  const q = query.trim().toLowerCase();
  const filteredTables = useMemo(() => {
    if (!q) return tables.slice(0, 6);
    return tables.filter(t =>
      String(t.number).includes(q) ||
      (t.label?.toLowerCase().includes(q) ?? false)
    ).slice(0, 8);
  }, [q, tables]);

  const filteredReservations = useMemo(() => {
    if (!q) return reservations.slice(0, 6);
    return reservations.filter(r =>
      r.customer_name.toLowerCase().includes(q) ||
      (r.customer_phone?.toLowerCase().includes(q) ?? false) ||
      r.reserved_date.includes(q)
    ).slice(0, 8);
  }, [q, reservations]);

  const total = filteredTables.length + filteredReservations.length;

  const goReservations = () => { onClose(); router.push('/dashboard/reservations'); };
  const goDashboard = () => { onClose(); router.push('/dashboard'); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-pop border-l border-[#E5E7EB] flex flex-col animate-in slide-in-from-right-4 duration-200">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
          <Search size={18} className="text-[#6B7280]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Αναζήτηση τραπεζιών, πελατών, κρατήσεων…"
            className="flex-1 bg-transparent border-0 outline-none text-[14px] text-[#0A0A0A] placeholder-[#9CA3AF]"
          />
          <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-semibold text-[#6B7280] bg-[#F8F8F8] border border-[#E5E7EB] rounded px-1.5 py-0.5">ESC</kbd>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F8F8F8]"
            aria-label="Κλείσιμο"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 px-5 py-8 text-[13px] text-[#6B7280]">
              <Loader2 size={14} className="animate-spin" /> Φόρτωση…
            </div>
          )}

          {!loading && total === 0 && (
            <div className="px-5 py-12 text-center">
              <Search size={28} className="mx-auto text-[#D1D5DB] mb-2" />
              <p className="text-[13px] text-[#6B7280]">
                {q ? 'Δεν βρέθηκαν αποτελέσματα' : 'Πληκτρολογήστε για αναζήτηση'}
              </p>
            </div>
          )}

          {!loading && filteredTables.length > 0 && (
            <section className="py-2">
              <h3 className="px-5 py-2 text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.1em] flex items-center gap-2">
                <UtensilsCrossed size={12} /> Τραπέζια
                <span className="text-[#9CA3AF] font-medium">· {filteredTables.length}</span>
              </h3>
              <ul>
                {filteredTables.map(t => (
                  <li key={t.id}>
                    <button
                      onClick={goDashboard}
                      className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-[#F8F8F8] text-left"
                    >
                      <div className="w-9 h-9 rounded-md bg-[#F97316]/10 text-[#F97316] flex items-center justify-center font-bold text-[12px] flex-shrink-0">
                        #{t.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-[#0A0A0A] tracking-tight">Τραπέζι {t.number}</span>
                          {t.label && (
                            <span className="text-[10px] text-[#C2410C] bg-[#F97316]/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{t.label}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#6B7280] flex items-center gap-2 mt-0.5">
                          <span className={cn(
                            'font-semibold',
                            t.status === 'available' && 'text-[#047857]',
                            t.status === 'occupied' && 'text-[#B91C1C]',
                          )}>{getStatusLabel(t.status)}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Users size={11} /> {t.seats}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!loading && filteredReservations.length > 0 && (
            <section className="py-2 border-t border-[#E5E7EB]">
              <h3 className="px-5 py-2 text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.1em] flex items-center gap-2">
                <CalendarDays size={12} /> Κρατήσεις
                <span className="text-[#9CA3AF] font-medium">· {filteredReservations.length}</span>
              </h3>
              <ul>
                {filteredReservations.map(r => (
                  <li key={r.id}>
                    <button
                      onClick={goReservations}
                      className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-[#F8F8F8] text-left"
                    >
                      <div className="w-9 h-9 rounded-md bg-[#0A0A0A] text-white flex flex-col items-center justify-center flex-shrink-0">
                        <Clock size={9} className="text-[#F97316]" />
                        <span className="text-[10px] font-bold tabular-nums">{r.reserved_time.slice(0, 5)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-[#0A0A0A] tracking-tight truncate">{r.customer_name}</div>
                        <div className="text-[11px] text-[#6B7280] flex items-center gap-2 mt-0.5">
                          <span>{r.reserved_date}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Users size={11} /> {r.party_size}</span>
                          {r.customer_phone && (<><span>·</span><span>{r.customer_phone}</span></>)}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#6B7280]">
          <span>{total} αποτελέσματα</span>
          <div className="flex items-center gap-2">
            <kbd className="font-mono font-semibold bg-[#F8F8F8] border border-[#E5E7EB] rounded px-1.5 py-0.5">↵</kbd>
            <span>μετάβαση</span>
          </div>
        </div>
      </div>
    </div>
  );
}
