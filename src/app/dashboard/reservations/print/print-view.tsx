'use client';

import { useEffect } from 'react';
import { Reservation, Table } from '@/types';
import { Printer } from 'lucide-react';

interface Props {
  restaurantName: string;
  date: string;
  reservations: Reservation[];
  tables: Table[];
}

// el-GR weekday + day + month, e.g. "Δευτέρα, 6 Μαΐου 2026"
function formatDateGr(iso: string): string {
  return new Intl.DateTimeFormat('el-GR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso + 'T00:00:00'));
}

// Compact time format used by the host. Reservations are stored "HH:MM"
// already; this is just a defensive trim.
function formatTime(t: string): string {
  return t.length > 5 ? t.slice(0, 5) : t;
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'Εκκρεμής',
  confirmed: 'Επιβεβαιωμένη',
  seated:    'Καθιστή',
};

export function PrintView({ restaurantName, date, reservations, tables }: Props) {
  // Auto-print when the page mounts — matches the user expectation of
  // clicking "Εκτύπωση" on the list and getting straight to the OS dialog.
  // Wrapped in setTimeout so the layout/fonts are painted first; without
  // it Safari occasionally prints a blank header.
  useEffect(() => {
    const id = setTimeout(() => window.print(), 200);
    return () => clearTimeout(id);
  }, []);

  const tableLabel = (id?: string) => {
    if (!id) return '—';
    const t = tables.find(t => t.id === id);
    return t ? `Τραπ. ${t.number}${t.label ? ` · ${t.label}` : ''}` : '—';
  };

  const totalGuests = reservations.reduce((sum, r) => sum + r.guests, 0);

  return (
    <>
      {/* This route lives under /dashboard/* so it inherits the dashboard
          layout (sidebar + topbar + bottom nav). Two jobs for this stylesheet:
          (1) on-screen, the print view sits above the chrome via fixed
              positioning so the user doesn't see dashboard scaffolding behind
              it before window.print() fires.
          (2) for the print mode itself, hide everything that isn't the page,
              and unfix the wrapper so the browser paginates naturally. */}
      <style>{`
        .print-page {
          position: fixed; inset: 0; z-index: 9999;
          overflow: auto; background: white;
        }
        @media print {
          @page { margin: 14mm; }
          html, body { background: white !important; }
          /* Dashboard chrome that lives outside this component. */
          aside, header, nav, .print\\:hidden { display: none !important; }
          /* Restore normal flow so the print engine can paginate. */
          .print-page {
            position: static !important; inset: auto !important;
            z-index: auto !important; overflow: visible !important;
            box-shadow: none !important; border: none !important;
          }
        }
      `}</style>

      <div className="bg-white text-[#0A0A0A] py-8 px-6 print-page">
        <div className="max-w-3xl mx-auto">
          {/* Screen-only toolbar — buttons disappear on print via the
              utility class .print:hidden defined inline in the @page rule. */}
          <div className="print:hidden flex items-center justify-between mb-6 pb-4 border-b border-[#E5E7EB]">
            <p className="text-[13px] text-[#6B7280]">
              Πατήστε <kbd className="px-1.5 py-0.5 rounded border border-[#E5E7EB] text-[11px] font-mono bg-[#F8F8F8]">Ctrl+P</kbd> εάν δεν ανοίξει αυτόματα ο διάλογος.
            </p>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-[13px] font-bold rounded-lg transition-colors"
            >
              <Printer size={15} strokeWidth={2.4} />
              Εκτύπωση
            </button>
          </div>

          <header className="mb-6">
            <h1 className="text-[22px] font-extrabold tracking-tight">{restaurantName}</h1>
            <p className="text-[13px] text-[#6B7280] mt-0.5 capitalize">
              Κρατήσεις — {formatDateGr(date)}
            </p>
            <div className="mt-2 flex items-center gap-4 text-[12px] text-[#6B7280]">
              <span><strong className="text-[#0A0A0A] font-bold tabular-nums">{reservations.length}</strong> κρατήσεις</span>
              <span><strong className="text-[#0A0A0A] font-bold tabular-nums">{totalGuests}</strong> συνολικά άτομα</span>
            </div>
          </header>

          {reservations.length === 0 ? (
            <p className="text-[13px] text-[#6B7280] py-8 text-center">
              Δεν υπάρχουν ενεργές κρατήσεις για αυτή την ημερομηνία.
            </p>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-y border-[#0A0A0A] text-left">
                  <th className="py-2 pr-3 font-bold uppercase tracking-wider text-[10px] w-[60px]">Ώρα</th>
                  <th className="py-2 pr-3 font-bold uppercase tracking-wider text-[10px]">Πελάτης</th>
                  <th className="py-2 pr-3 font-bold uppercase tracking-wider text-[10px] w-[44px] text-right">Άτ.</th>
                  <th className="py-2 pr-3 font-bold uppercase tracking-wider text-[10px] w-[110px]">Τραπέζι</th>
                  <th className="py-2 pr-3 font-bold uppercase tracking-wider text-[10px] w-[100px]">Τηλέφωνο</th>
                  <th className="py-2 pr-3 font-bold uppercase tracking-wider text-[10px]">Σημειώσεις</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => (
                  <tr key={r.id} className="border-b border-[#E5E7EB] align-top">
                    <td className="py-2.5 pr-3 font-bold tabular-nums">{formatTime(r.time)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="font-bold">{r.name}</div>
                      <div className="text-[10px] text-[#6B7280] uppercase tracking-wider">
                        {STATUS_LABEL[r.status] ?? r.status}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-right font-semibold">{r.guests}</td>
                    <td className="py-2.5 pr-3">{tableLabel(r.table_id)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{r.phone || '—'}</td>
                    <td className="py-2.5 pr-3 text-[#374151] text-[12px]">
                      {r.notes
                        ? <em className="not-italic">&ldquo;{r.notes}&rdquo;</em>
                        : <span className="text-[#9CA3AF]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <footer className="mt-6 pt-3 border-t border-[#E5E7EB] text-[10px] text-[#9CA3AF] tabular-nums">
            Εκτυπώθηκε {new Date().toLocaleString('el-GR')}
          </footer>
        </div>
      </div>
    </>
  );
}
