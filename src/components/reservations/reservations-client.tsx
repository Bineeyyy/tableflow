'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { UndoToast } from '@/components/ui/undo-toast';
import { useUndoAction } from '@/hooks/use-undo-action';
import { Reservation, ReservationStatus, Table } from '@/types';
import type { Tables } from '@/types/database.types';
import { upsertReservation, deleteReservation, updateReservationStatus } from '@/app/actions/reservations';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Plus, Phone, Users, Clock, CalendarDays, Printer,
  CheckCircle2, AlertCircle, XCircle, UtensilsCrossed,
  Pencil, Trash2, ChevronDown,
} from 'lucide-react';

type DbReservation = Tables<'reservations'>;

// Defensive coercion mirrors server-queries.mapReservation. Realtime payloads
// arrive as raw rows; if a column is ever nullable a `.slice` could otherwise
// crash the page.
function mapReservationRow(r: DbReservation): Reservation {
  const time = typeof r.reserved_time === 'string' ? r.reserved_time.slice(0, 5) : '';
  return {
    id: r.id,
    name: r.customer_name ?? '',
    phone: r.customer_phone ?? '',
    date: r.reserved_date ?? '',
    time,
    guests: r.party_size ?? 0,
    table_id: r.table_id ?? undefined,
    status: r.status,
    notes: r.notes ?? '',
    created_at: r.created_at ?? '',
  };
}

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Εκκρεμής',      color: 'bg-[#F97316]/10 text-[#C2410C] ring-1 ring-inset ring-[#F97316]/20', icon: <AlertCircle size={12} />     },
  confirmed: { label: 'Επιβεβαιωμένη', color: 'bg-[#10B981]/10 text-[#047857] ring-1 ring-inset ring-[#10B981]/20', icon: <CheckCircle2 size={12} />    },
  seated:    { label: 'Εστιατόριο',    color: 'bg-[#3B82F6]/10 text-[#1D4ED8] ring-1 ring-inset ring-[#3B82F6]/20', icon: <UtensilsCrossed size={12} /> },
  completed: { label: 'Ολοκληρώθηκε',  color: 'bg-[#F8F8F8] text-[#6B7280] ring-1 ring-inset ring-[#E5E7EB]',       icon: <CheckCircle2 size={12} />    },
  cancelled: { label: 'Ακυρώθηκε',     color: 'bg-[#EF4444]/10 text-[#B91C1C] ring-1 ring-inset ring-[#EF4444]/20', icon: <XCircle size={12} />         },
};

type DateFilter = 'today' | 'tomorrow' | 'all';

// Built per-click rather than at module load so the date defaults to *today*
// even when the tab has been left open across midnight. A const evaluated at
// import time would freeze on yesterday until the SPA reloaded.
const makeEmptyForm = () => ({
  name: '', phone: '', date: new Date().toISOString().split('T')[0],
  time: '20:00', guests: '2', table_id: '', status: 'confirmed' as ReservationStatus, notes: '',
});

interface Props {
  initialReservations: Reservation[];
  tables: Table[];
  restaurantId: string;
}

export function ReservationsClient({ initialReservations, tables, restaurantId }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [filter, setFilter] = useState<DateFilter>('today');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Reservation | null>(null);
  const [form, setForm] = useState(makeEmptyForm);
  const [saving, setSaving] = useState(false);
  // setSaving(true) doesn't take effect synchronously, so disabled={saving}
  // can't gate a fast Enter-key resubmit before React paints. The ref does —
  // it mutates immediately and the re-entry check sees the truthy value.
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  // Status menu was previously hover-only (`group-hover:block`), which never
  // fires on touch — iOS users couldn't change reservation status from this
  // list at all. Track an explicit open id so the menu works on tap.
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  // Cancellation is destructive (table frees up, slot reopens for booking),
  // and the status menu is a single tap with no undo. Gate it behind a
  // small confirmation modal showing whose reservation is about to drop.
  const [cancelConfirm, setCancelConfirm] = useState<{ id: string; name: string } | null>(null);

  // Close the status menu on Escape so keyboard users can dismiss without
  // chasing the backdrop.
  useEffect(() => {
    if (!openStatusId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenStatusId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openStatusId]);

  // Realtime: keep the list in sync with cross-device edits. Without this,
  // a waiter seating a reservation from their phone wouldn't show on the
  // desktop list until manual refresh — and waiter.ts no longer calls
  // revalidatePath, so a stale list could persist for a whole shift.
  // RLS scopes the publication server-side, so other restaurants' rows
  // never reach this client.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`reservations-page:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id?: string }).id;
            if (id) setReservations(prev => prev.filter(r => r.id !== id));
            return;
          }
          const row = mapReservationRow(payload.new as DbReservation);
          setReservations(prev => {
            const idx = prev.findIndex(r => r.id === row.id);
            if (idx === -1) return [row, ...prev];
            const next = prev.slice(); next[idx] = row; return next;
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const filtered = useMemo(() => {
    return reservations
      .filter(r => {
        if (filter === 'today')    return r.date === today;
        if (filter === 'tomorrow') return r.date === tomorrow;
        return true;
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [reservations, filter, today, tomorrow]);

  const counts = {
    today:    reservations.filter(r => r.date === today).length,
    tomorrow: reservations.filter(r => r.date === tomorrow).length,
    all:      reservations.length,
  };

  const openAdd = () => {
    setEditItem(null);
    setForm(makeEmptyForm());
    setError('');
    setShowModal(true);
  };

  const openEdit = (r: Reservation) => {
    setEditItem(r);
    setForm({
      name: r.name, phone: r.phone, date: r.date, time: r.time,
      guests: String(r.guests), table_id: r.table_id || '', status: r.status, notes: r.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const save = async () => {
    if (savingRef.current) return;
    if (!form.name || !form.date || !form.time || !form.guests) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const res = await upsertReservation(
        { ...form, guests: parseInt(form.guests), table_id: form.table_id || undefined },
        editItem?.id,
      );
      if ('error' in res) { setError(res.error); return; }
      setReservations(prev =>
        editItem
          ? prev.map(r => r.id === editItem.id ? res.reservation : r)
          : [res.reservation, ...prev],
      );
      setShowModal(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // Destructive actions defer the server call by 5s and surface an undo toast.
  // Less destructive status changes (pending/confirmed/seated/completed) commit
  // immediately — the user can flip them back by reopening the menu.
  const undoAction = useUndoAction(5000);

  const remove = (id: string) => {
    const target = reservations.find(r => r.id === id);
    if (!target) return;
    const snapshot = reservations;
    setReservations(prev => prev.filter(r => r.id !== id));
    undoAction.run({
      id: `del-${id}`,
      label: `Διαγράφηκε η κράτηση ${target.name}`,
      revert: () => setReservations(snapshot),
      commit: async () => {
        const res = await deleteReservation(id);
        if ('error' in res) {
          console.error('Failed to delete reservation:', res.error);
          setReservations(snapshot);
        }
      },
    });
  };

  const changeStatus = (id: string, status: ReservationStatus) => {
    const target = reservations.find(r => r.id === id);
    if (!target) return;
    const snapshot = reservations;
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));

    // Cancellation is reservation-killing in practice — surface undo. Other
    // status flips are easily corrected by reopening the menu, so we commit
    // them straight away.
    if (status === 'cancelled' && target.status !== 'cancelled') {
      undoAction.run({
        id: `cancel-${id}`,
        label: `Ακυρώθηκε η κράτηση ${target.name}`,
        revert: () => setReservations(snapshot),
        commit: async () => {
          const res = await updateReservationStatus(id, status);
          if ('error' in res) {
            console.error('Failed to update status:', res.error);
            setReservations(snapshot);
          }
        },
      });
      return;
    }

    void (async () => {
      const res = await updateReservationStatus(id, status);
      if ('error' in res) {
        console.error('Failed to update status:', res.error);
        setReservations(snapshot);
      }
    })();
  };

  const getTableLabel = (tableId?: string) => {
    if (!tableId) return 'Αδιάθετο';
    const t = tables.find(t => t.id === tableId);
    return t ? `Τραπέζι ${t.number}${t.label ? ` (${t.label})` : ''}` : '—';
  };

  const formatDateGr = (iso: string) =>
    new Intl.DateTimeFormat('el-GR', { weekday: 'long', day: 'numeric', month: 'long' })
      .format(new Date(iso + 'T00:00:00'));

  return (
    <>
      {/* Tap-anywhere-to-close backdrop for the status menu. Sits below the
          menu (z-10) but above the list rows so a tap on another part of the
          page first closes the open menu instead of clicking through. */}
      {openStatusId && (
        <div
          aria-hidden
          onClick={() => setOpenStatusId(null)}
          className="fixed inset-0 z-10"
        />
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-3 md:p-6 space-y-4 md:space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex gap-2">
            {([
              { key: 'today',    label: 'Σήμερα', count: counts.today    },
              { key: 'tomorrow', label: 'Αύριο',  count: counts.tomorrow },
              { key: 'all',      label: 'Όλες',   count: counts.all      },
            ] as { key: DateFilter; label: string; count: number }[]).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-1.5',
                  filter === f.key
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-white text-[#0A0A0A] border border-[#E5E7EB] hover:bg-[#F8F8F8]',
                )}
              >
                {f.label}
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-bold tabular-nums',
                  filter === f.key ? 'bg-white/20 text-white' : 'bg-[#F8F8F8] text-[#6B7280]',
                )}>{f.count}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {/* Print: opens a clean A4-style sheet for the currently filtered
                day (today/tomorrow). 'all' falls back to today since nobody
                wants to print every reservation in the database on one page. */}
            <a
              href={`/dashboard/reservations/print?date=${
                filter === 'tomorrow' ? tomorrow : today
              }`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 px-3 py-2 bg-white text-[#0A0A0A] border border-[#E5E7EB] hover:bg-[#F8F8F8] text-[13px] font-bold rounded-lg transition-colors active:scale-[0.98]"
              title="Εκτύπωση κρατήσεων"
            >
              <Printer size={15} strokeWidth={2.4} />
              <span className="hidden sm:inline">Εκτύπωση</span>
            </a>

            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-[13px] font-bold rounded-lg transition-colors active:scale-[0.98]"
            >
              <Plus size={16} strokeWidth={2.6} />
              Νέα Κράτηση
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-card overflow-hidden">
          {filter !== 'all' && (
            <div className="px-6 py-3 bg-[#F8F8F8] border-b border-[#E5E7EB]">
              <p className="text-[12px] font-bold text-[#6B7280] capitalize uppercase tracking-wider">
                {filter === 'today' ? formatDateGr(today) : formatDateGr(tomorrow)}
              </p>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarDays size={40} className="mx-auto text-[#D1D5DB] mb-3" />
              <p className="text-[#0A0A0A] font-bold tracking-tight">Δεν υπάρχουν κρατήσεις</p>
              <p className="text-[#6B7280] text-[13px] mt-1">Προσθέστε μια νέα κράτηση</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {filtered.map(r => {
                const sc = STATUS_CONFIG[r.status];
                return (
                  <div key={r.id} className="px-6 py-4 hover:bg-[#F8F8F8] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg bg-[#F97316]/10 flex flex-col items-center justify-center flex-shrink-0">
                        <Clock size={12} className="text-[#F97316] mb-0.5" />
                        <span className="text-[13px] font-extrabold text-[#F97316] tabular-nums">{r.time}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#0A0A0A] tracking-tight">{r.name}</span>
                          <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider', sc.color)}>
                            {sc.icon}{sc.label}
                          </span>
                          {filter === 'all' && (
                            <span className="text-[11px] text-[#6B7280] bg-[#F8F8F8] border border-[#E5E7EB] px-2 py-0.5 rounded-md font-medium">
                              {formatDateGr(r.date)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-[13px] text-[#6B7280] flex-wrap">
                          <span className="flex items-center gap-1"><Users size={13} />{r.guests} άτομα</span>
                          <span className="flex items-center gap-1"><UtensilsCrossed size={13} />{getTableLabel(r.table_id)}</span>
                          {r.phone && <span className="flex items-center gap-1"><Phone size={13} />{r.phone}</span>}
                          {r.notes && <span className="italic text-[#9CA3AF] truncate max-w-[200px]">&ldquo;{r.notes}&rdquo;</span>}
                        </div>
                      </div>

                      {/* Quick status change — click-to-toggle so iOS taps work */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setOpenStatusId(prev => prev === r.id ? null : r.id)}
                          aria-expanded={openStatusId === r.id}
                          aria-haspopup="menu"
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-[12px] font-semibold transition-colors',
                            openStatusId === r.id
                              ? 'border-[#0A0A0A] text-[#0A0A0A] bg-[#F8F8F8]'
                              : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#0A0A0A] hover:text-[#0A0A0A]',
                          )}
                        >
                          Αλλαγή
                          <ChevronDown
                            size={12}
                            className={cn('transition-transform', openStatusId === r.id && 'rotate-180')}
                          />
                        </button>
                        {openStatusId === r.id && (
                          <div role="menu" className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E5E7EB] rounded-lg shadow-pop z-20 overflow-hidden">
                            {(Object.entries(STATUS_CONFIG) as [ReservationStatus, typeof STATUS_CONFIG[ReservationStatus]][]).map(([key, cfg]) => (
                              <button
                                key={key}
                                role="menuitem"
                                onClick={() => {
                                  setOpenStatusId(null);
                                  if (key === 'cancelled' && r.status !== 'cancelled') {
                                    setCancelConfirm({ id: r.id, name: r.name });
                                  } else {
                                    changeStatus(r.id, key);
                                  }
                                }}
                                className={cn('w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-[#F8F8F8] transition-colors', r.status === key && 'bg-[#F8F8F8] font-bold')}
                              >
                                {cfg.icon}<span>{cfg.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Edit / Delete */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-md hover:bg-[#F8F8F8] text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => remove(r.id)} className="p-1.5 rounded-md hover:bg-[#EF4444]/10 text-[#6B7280] hover:text-[#EF4444] transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Επεξεργασία Κράτησης' : 'Νέα Κράτηση'} size="lg">
        {/* Form-wrapped so Enter on any input submits, matching every other
            data-entry form on the web. The textarea (Σημειώσεις) keeps its
            native multi-line Enter — only single-line inputs trigger submit. */}
        <form
          onSubmit={(e) => { e.preventDefault(); save(); }}
          className="grid grid-cols-2 gap-4"
        >
          {error && (
            <div className="col-span-2 px-3 py-2 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-[#B91C1C] text-[13px]">
              {error}
            </div>
          )}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Όνομα πελάτη *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="π.χ. Μαρία Παπαδοπούλου"
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Τηλέφωνο</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="69XXXXXXXX"
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Ημερομηνία *</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Ώρα *</label>
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Αριθμός ατόμων *</label>
            <input type="number" min="1" max="20" value={form.guests} onChange={e => setForm(f => ({ ...f, guests: e.target.value }))}
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Τραπέζι</label>
            <select value={form.table_id} onChange={e => setForm(f => ({ ...f, table_id: e.target.value }))}
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white">
              <option value="">— Επιλογή τραπεζιού</option>
              {tables.map(t => (
                <option key={t.id} value={t.id}>
                  Τραπέζι {t.number} ({t.seats} θέσεις{t.label ? ` · ${t.label}` : ''})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Κατάσταση</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ReservationStatus }))}
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 bg-white">
              {(Object.entries(STATUS_CONFIG) as [ReservationStatus, typeof STATUS_CONFIG[ReservationStatus]][]).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[12px] font-semibold text-[#0A0A0A] mb-1.5 uppercase tracking-wider">Σημειώσεις</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Αλλεργίες, ειδικές απαιτήσεις, αφορμή..."
              rows={2}
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15 resize-none" />
          </div>
          <div className="col-span-2 flex gap-3 pt-2 border-t border-[#E5E7EB]">
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] font-semibold text-[#0A0A0A] hover:bg-[#F8F8F8] transition-colors">
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={saving || !form.name || !form.date || !form.time || !form.guests}
              className="flex-1 px-4 py-2.5 bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-40 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : editItem ? 'Αποθήκευση' : 'Δημιουργία Κράτησης'
              }
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={cancelConfirm !== null}
        onClose={() => setCancelConfirm(null)}
        title="Ακύρωση κράτησης"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-[#0A0A0A] leading-relaxed">
            Σίγουρα θέλετε να ακυρώσετε την κράτηση
            {cancelConfirm && <strong className="font-bold"> {cancelConfirm.name}</strong>};
          </p>
          <p className="text-[12px] text-[#6B7280]">
            Το τραπέζι θα απελευθερωθεί για άλλους πελάτες.
          </p>
          <div className="flex gap-3 pt-2 border-t border-[#E5E7EB]">
            <button
              onClick={() => setCancelConfirm(null)}
              className="flex-1 px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] font-semibold text-[#0A0A0A] hover:bg-[#F8F8F8] transition-colors"
            >
              Όχι, διατήρηση
            </button>
            <button
              onClick={() => {
                if (cancelConfirm) changeStatus(cancelConfirm.id, 'cancelled');
                setCancelConfirm(null);
              }}
              className="flex-1 px-4 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-white text-[13px] font-bold rounded-lg transition-colors"
            >
              Ναι, ακύρωση
            </button>
          </div>
        </div>
      </Modal>

      <UndoToast pending={undoAction.pending} undo={undoAction.undo} delayMs={undoAction.delayMs} />
    </>
  );
}
