'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Bell, Loader2, CalendarDays, UtensilsCrossed, Clock,
  CheckCircle2, AlertCircle, XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database.types';

type DbReservation = Tables<'reservations'>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onChange?: (unread: number) => void;
}

type NotifKind = 'reservation_new' | 'reservation_status';

interface Notif {
  id: string;
  kind: NotifKind;
  title: string;
  detail: string;
  ts: number;
  iconBg: string;
  Icon: React.ElementType;
  iconColor: string;
  href: string;
}

function formatRelative(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'μόλις τώρα';
  if (m < 60) return `${m}′ πριν`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ώ. πριν`;
  const d = Math.floor(h / 24);
  return `${d} ημ. πριν`;
}

const STATUS_TEXT: Record<DbReservation['status'], string> = {
  pending: 'Εκκρεμής',
  confirmed: 'Επιβεβαιώθηκε',
  seated: 'Στο τραπέζι',
  completed: 'Ολοκληρώθηκε',
  cancelled: 'Ακυρώθηκε',
};

const STATUS_ICON: Record<DbReservation['status'], React.ElementType> = {
  pending: AlertCircle,
  confirmed: CheckCircle2,
  seated: UtensilsCrossed,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export function NotificationsDrawer({ isOpen, onClose, onChange }: Props) {
  const router = useRouter();
  const [reservations, setReservations] = useState<DbReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Lazy fetch — last 24h only
  useEffect(() => {
    if (!isOpen || loaded) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sb = createClient();
        const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
        const rRes = await sb.from('reservations')
          .select('*')
          .gte('updated_at', cutoff)
          .order('updated_at', { ascending: false })
          .limit(20);
        if (cancelled) return;
        setReservations(rRes.data ?? []);
        setLoaded(true);
      } catch (err) {
        console.error('[notifications] fetch failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, loaded]);

  const items = useMemo<Notif[]>(() => {
    const list: Notif[] = [];
    for (const r of reservations) {
      const created = new Date(r.created_at).getTime();
      const updated = new Date(r.updated_at ?? r.created_at).getTime();
      const isNew = Math.abs(updated - created) < 5_000;
      const Icon = isNew ? CalendarDays : STATUS_ICON[r.status];
      list.push({
        id: `r-${r.id}`,
        kind: isNew ? 'reservation_new' : 'reservation_status',
        title: isNew ? `Νέα κράτηση · ${r.customer_name}` : `${r.customer_name} → ${STATUS_TEXT[r.status]}`,
        detail: `${r.reserved_date} ${r.reserved_time.slice(0, 5)} · ${r.party_size} άτομα`,
        ts: updated,
        iconBg: 'bg-[#F97316]/10',
        Icon,
        iconColor: 'text-[#F97316]',
        href: '/dashboard/reservations',
      });
    }
    list.sort((a, b) => b.ts - a.ts);
    return list.slice(0, 30);
  }, [reservations]);

  // Surface unread count to parent (so the bell can show a dot)
  useEffect(() => {
    if (loaded) onChange?.(items.length);
  }, [loaded, items.length, onChange]);

  const click = (n: Notif) => { onClose(); router.push(n.href); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute top-0 right-0 h-full w-full max-w-sm bg-white shadow-pop border-l border-[#E5E7EB] flex flex-col animate-in slide-in-from-right-4 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={17} className="text-[#0A0A0A]" />
            <h2 className="text-[15px] font-bold text-[#0A0A0A] tracking-tight">Ειδοποιήσεις</h2>
            {items.length > 0 && (
              <span className="text-[10px] font-bold text-white bg-[#F97316] rounded-md px-1.5 py-0.5 tabular-nums">{items.length}</span>
            )}
          </div>
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

          {!loading && items.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Bell size={28} className="mx-auto text-[#D1D5DB] mb-2" />
              <p className="text-[13px] font-bold text-[#0A0A0A]">Καμία πρόσφατη δραστηριότητα</p>
              <p className="text-[12px] text-[#6B7280] mt-1">Οι ειδοποιήσεις των τελευταίων 24 ωρών θα εμφανίζονται εδώ.</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <ul className="divide-y divide-[#E5E7EB]">
              {items.map(n => {
                const Icon = n.Icon;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => click(n)}
                      className="w-full text-left flex items-start gap-3 px-5 py-3 hover:bg-[#F8F8F8]"
                    >
                      <div className={`w-9 h-9 rounded-md ${n.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon size={15} className={n.iconColor} strokeWidth={2.4} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-[#0A0A0A] tracking-tight truncate">{n.title}</div>
                        <div className="text-[11px] text-[#6B7280] mt-0.5 truncate">{n.detail}</div>
                      </div>
                      <span className="text-[10px] text-[#9CA3AF] font-semibold flex-shrink-0 mt-1 whitespace-nowrap">{formatRelative(n.ts)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#6B7280]">
          <span className="flex items-center gap-1"><Clock size={11} /> Τελευταίες 24 ώρες</span>
          <button onClick={() => { onClose(); router.push('/dashboard/reservations'); }} className="font-bold text-[#F97316] hover:text-[#EA580C]">
            Όλες οι κρατήσεις →
          </button>
        </div>
      </div>
    </div>
  );
}
