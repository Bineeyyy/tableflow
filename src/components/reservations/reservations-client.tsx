'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Reservation, ReservationStatus, Table } from '@/types';
import { upsertReservation, deleteReservation, updateReservationStatus } from '@/lib/supabase/queries';
import { cn } from '@/lib/utils';
import {
  Plus, Phone, Users, Clock, CalendarDays,
  CheckCircle2, AlertCircle, XCircle, UtensilsCrossed,
  Pencil, Trash2, ChevronDown,
} from 'lucide-react';

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Εκκρεμής',      color: 'bg-[#F97316]/10 text-[#C2410C] ring-1 ring-inset ring-[#F97316]/20', icon: <AlertCircle size={12} />     },
  confirmed: { label: 'Επιβεβαιωμένη', color: 'bg-[#10B981]/10 text-[#047857] ring-1 ring-inset ring-[#10B981]/20', icon: <CheckCircle2 size={12} />    },
  seated:    { label: 'Εστιατόριο',    color: 'bg-[#3B82F6]/10 text-[#1D4ED8] ring-1 ring-inset ring-[#3B82F6]/20', icon: <UtensilsCrossed size={12} /> },
  completed: { label: 'Ολοκληρώθηκε',  color: 'bg-[#F8F8F8] text-[#6B7280] ring-1 ring-inset ring-[#E5E7EB]',       icon: <CheckCircle2 size={12} />    },
  cancelled: { label: 'Ακυρώθηκε',     color: 'bg-[#EF4444]/10 text-[#B91C1C] ring-1 ring-inset ring-[#EF4444]/20', icon: <XCircle size={12} />         },
};

type DateFilter = 'today' | 'tomorrow' | 'all';

const emptyForm = {
  name: '', phone: '', date: new Date().toISOString().split('T')[0],
  time: '20:00', guests: '2', table_id: '', status: 'confirmed' as ReservationStatus, notes: '',
};

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
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    setForm(emptyForm);
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
    if (!form.name || !form.date || !form.time || !form.guests) return;
    setSaving(true);
    setError('');
    try {
      const saved = await upsertReservation(
        restaurantId,
        { ...form, guests: parseInt(form.guests), table_id: form.table_id || undefined },
        editItem?.id,
      );
      setReservations(prev =>
        editItem
          ? prev.map(r => r.id === editItem.id ? saved : r)
          : [saved, ...prev],
      );
      setShowModal(false);
    } catch {
      setError('Σφάλμα κατά την αποθήκευση. Δοκιμάστε ξανά.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setReservations(prev => prev.filter(r => r.id !== id));
    try {
      await deleteReservation(id);
    } catch (err) {
      console.error('Failed to delete reservation:', err);
    }
  };

  const changeStatus = async (id: string, status: ReservationStatus) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    try {
      await updateReservationStatus(id, status);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
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
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
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

          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-[13px] font-bold rounded-lg transition-colors active:scale-[0.98]"
          >
            <Plus size={16} strokeWidth={2.6} />
            Νέα Κράτηση
          </button>
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

                      {/* Quick status change */}
                      <div className="relative group flex-shrink-0">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-md text-[12px] font-semibold text-[#6B7280] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors">
                          Αλλαγή <ChevronDown size={12} />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E5E7EB] rounded-lg shadow-pop z-20 hidden group-hover:block overflow-hidden">
                          {(Object.entries(STATUS_CONFIG) as [ReservationStatus, typeof STATUS_CONFIG[ReservationStatus]][]).map(([key, cfg]) => (
                            <button
                              key={key}
                              onClick={() => changeStatus(r.id, key)}
                              className={cn('w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-[#F8F8F8] transition-colors', r.status === key && 'bg-[#F8F8F8] font-bold')}
                            >
                              {cfg.icon}<span>{cfg.label}</span>
                            </button>
                          ))}
                        </div>
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
        <div className="grid grid-cols-2 gap-4">
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
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] font-semibold text-[#0A0A0A] hover:bg-[#F8F8F8] transition-colors">
              Ακύρωση
            </button>
            <button
              onClick={save}
              disabled={saving || !form.name || !form.date || !form.time || !form.guests}
              className="flex-1 px-4 py-2.5 bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-40 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : editItem ? 'Αποθήκευση' : 'Δημιουργία Κράτησης'
              }
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
