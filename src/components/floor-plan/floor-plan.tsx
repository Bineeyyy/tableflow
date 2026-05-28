'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableStatus, Reservation } from '@/types';
import type { Tables } from '@/types/database.types';
import { TableNode } from './table-node';
import { TableDetailPanel } from './table-detail-panel';
import { OccupyModal } from '@/components/ui/occupy-modal';
import { setTableOccupancy } from '@/app/actions/waiter';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { LayoutGrid, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

type DbTable = Tables<'restaurant_tables'>;
type DbReservation = Tables<'reservations'>;

const LEGEND = [
  { status: 'available' as TableStatus, label: 'Ελεύθερο',     color: 'bg-[#10B981]' },
  { status: 'occupied'  as TableStatus, label: 'Κατειλημμένο', color: 'bg-[#EF4444]' },
];

function mapTable(t: DbTable): Table {
  return {
    id: t.id, number: t.number, seats: t.seats, current_guests: t.current_guests,
    status: t.status, x: t.pos_x, y: t.pos_y, shape: t.shape,
    label: t.label ?? undefined, zone: t.zone ?? undefined,
    seated_at: t.seated_at ?? undefined,
  };
}

function mapReservation(r: DbReservation): Reservation {
  const time = typeof r.reserved_time === 'string' ? r.reserved_time.slice(0, 5) : '';
  return {
    id: r.id, name: r.customer_name ?? '', phone: r.customer_phone ?? '',
    date: r.reserved_date ?? '', time,
    guests: r.party_size ?? 0, table_id: r.table_id ?? undefined,
    status: r.status, notes: r.notes ?? '', created_at: r.created_at ?? '',
  };
}

interface FloorPlanProps {
  initialTables: Table[];
  restaurantId: string;
  todayReservations: Reservation[];
}

// Sentinel for the "Όλες" zone tab. Empty string mirrors the DB default for
// tables with no zone set, so a literal `''` zone would clash — using a
// symbol-like sentinel avoids that.
const ZONE_ALL = '__ALL__';
// Fallback bucket for tables whose zone column is null/empty. Visible as a
// tab labelled "Χωρίς ζώνη" only if at least one such table exists.
const ZONE_UNASSIGNED = '__UNASSIGNED__';

// Canvas baseline — keep the same look-and-feel for small floor plans, then
// grow horizontally and vertically once tables sit outside the box.
const CANVAS_MIN_W = 860;
const CANVAS_MIN_H = 580;
// Padding around the rightmost/bottommost table so its status chip and
// duration pill (which render *below* the node) aren't clipped.
const CANVAS_PAD_X = 80;
const CANVAS_PAD_Y = 110;

export function FloorPlan({ initialTables, restaurantId, todayReservations }: FloorPlanProps) {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [reservations, setReservations] = useState<Reservation[]>(todayReservations);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [zoom, setZoom] = useState(1);
  const [occupyTarget, setOccupyTarget] = useState<Table | null>(null);
  const [live, setLive] = useState(false);
  // Active zone tab. Persisted only in component state — switching zones is
  // cheap and the realtime subscription keeps every zone fresh in the
  // background, so a refresh resetting to "Όλες" is acceptable.
  const [activeZone, setActiveZone] = useState<string>(ZONE_ALL);
  // Per-table in-flight set. Mirrors the guard the mobile FloorTab uses:
  // rapid double/triple taps would otherwise queue parallel server actions
  // whose final state is decided by whichever round-trip resolves last.
  const [pending, setPending] = useState<Set<string>>(new Set());

  // The dashboard's StatCards (occupied/available/expected guests) are
  // server-rendered from the page-level fetch and aren't part of this
  // component's useState, so realtime updates here keep the floor plan
  // fresh but leave the tiles above stale. Coalesce a router.refresh()
  // off any realtime echo to re-fetch the server props — debounced so a
  // burst of updates doesn't trigger N refetches.
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleStatsRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      router.refresh();
    }, 300);
  }, [router]);
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const startPending = useCallback((id: string) =>
    setPending(prev => { const next = new Set(prev); next.add(id); return next; }), []);
  const endPending = useCallback((id: string) =>
    setPending(prev => { const next = new Set(prev); next.delete(id); return next; }), []);

  const handleTableClick = useCallback((table: Table) => {
    setSelectedTable(prev => prev?.id === table.id ? null : table);
  }, []);

  const applyLocal = useCallback((tableId: string, patch: Partial<Table>) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...patch } : t));
    setSelectedTable(prev => prev?.id === tableId ? { ...prev, ...patch } : prev);
  }, []);

  // Real-time: mirror the waiter-app subscription so taps from a phone
  // propagate instantly to this canvas. RLS scopes the publication
  // server-side, so no other restaurants' rows reach this client.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`floor-plan:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_tables', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id?: string }).id;
            if (!id) return;
            setTables(prev => prev.filter(t => t.id !== id));
            setSelectedTable(prev => prev?.id === id ? null : prev);
            scheduleStatsRefresh();
            return;
          }
          const row = mapTable(payload.new as DbTable);
          setTables(prev => {
            const idx = prev.findIndex(t => t.id === row.id);
            if (idx === -1) return [...prev, row].sort((a, b) => a.number - b.number);
            const next = prev.slice(); next[idx] = row; return next;
          });
          setSelectedTable(prev => prev?.id === row.id ? row : prev);
          scheduleStatsRefresh();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id?: string }).id;
            if (id) setReservations(prev => prev.filter(r => r.id !== id));
            scheduleStatsRefresh();
            return;
          }
          const row = mapReservation(payload.new as DbReservation);
          // Floor plan badges only reflect today's reservations. If a row was
          // edited to a different date, drop it from local state.
          const today = new Date().toISOString().split('T')[0];
          if (row.date !== today) {
            setReservations(prev => prev.filter(r => r.id !== row.id));
            scheduleStatsRefresh();
            return;
          }
          setReservations(prev => {
            const idx = prev.findIndex(r => r.id === row.id);
            if (idx === -1) return [...prev, row].sort((a, b) => a.time.localeCompare(b.time));
            const next = prev.slice(); next[idx] = row; return next;
          });
          scheduleStatsRefresh();
        },
      )
      .subscribe(status => setLive(status === 'SUBSCRIBED'));

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, scheduleStatsRefresh]);

  const handleFree = useCallback(async (tableId: string) => {
    if (pending.has(tableId)) return;
    const prev = tables.find(t => t.id === tableId);
    if (!prev) return;
    const rollback = { status: prev.status, current_guests: prev.current_guests };
    applyLocal(tableId, { status: 'available', current_guests: 0 });
    startPending(tableId);
    try {
      const res = await setTableOccupancy(tableId, { occupied: false });
      if (res.error) {
        applyLocal(tableId, rollback);
        console.error('Failed to free table:', res.error);
      }
    } catch (e) {
      applyLocal(tableId, rollback);
      console.error('Failed to free table:', e);
    } finally {
      endPending(tableId);
    }
  }, [pending, tables, applyLocal, startPending, endPending]);

  const handleRequestOccupy = useCallback((table: Table) => {
    if (pending.has(table.id)) return;
    setOccupyTarget(table);
  }, [pending]);

  const handleConfirmOccupy = useCallback(async (guests: number) => {
    if (!occupyTarget) return;
    const tableId = occupyTarget.id;
    if (pending.has(tableId)) { setOccupyTarget(null); return; }
    const rollback = { status: occupyTarget.status, current_guests: occupyTarget.current_guests };
    setOccupyTarget(null);
    applyLocal(tableId, { status: 'occupied', current_guests: guests });
    startPending(tableId);
    try {
      const res = await setTableOccupancy(tableId, { occupied: true, guests });
      if (res.error) {
        applyLocal(tableId, rollback);
        console.error('Failed to occupy table:', res.error);
      }
    } catch (e) {
      applyLocal(tableId, rollback);
      console.error('Failed to occupy table:', e);
    } finally {
      endPending(tableId);
    }
  }, [occupyTarget, pending, applyLocal, startPending, endPending]);

  const closePanel = useCallback(() => setSelectedTable(null), []);
  const resetZoom = useCallback(() => setZoom(1), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.6, z - 0.1)), []);
  const zoomIn = useCallback(() => setZoom(z => Math.min(1.8, z + 0.1)), []);

  // Build the zone tabs from whatever zones the operator actually used. We
  // never invent a tab — the bar reflects the real layout, so "Bar" only
  // appears once at least one table is tagged with it.
  const zoneList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tables) {
      const key = t.zone && t.zone.trim() ? t.zone : ZONE_UNASSIGNED;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    // Stable ordering: Αίθουσα first when present (matches the historical
    // label on the canvas), then alphabetical, with the catch-all tab last.
    const named = Array.from(counts.entries())
      .filter(([k]) => k !== ZONE_UNASSIGNED)
      .sort(([a], [b]) => {
        if (a === 'Αίθουσα') return -1;
        if (b === 'Αίθουσα') return 1;
        return a.localeCompare(b, 'el');
      });
    const unassigned = counts.get(ZONE_UNASSIGNED);
    if (unassigned) named.push([ZONE_UNASSIGNED, unassigned]);
    return named;
  }, [tables]);

  // Resolve the requested tab against the live zone list — if the active
  // zone vanished (e.g. operator just removed its last table from settings),
  // fall back to "Όλες" at render time instead of writing back through an
  // effect. Avoids the set-state-in-effect cascade flagged by react-hooks.
  const effectiveZone = useMemo(() => {
    if (activeZone === ZONE_ALL) return ZONE_ALL;
    return zoneList.some(([k]) => k === activeZone) ? activeZone : ZONE_ALL;
  }, [activeZone, zoneList]);

  // Tables for the currently visible tab. "Όλες" is the only zone that shows
  // everything; otherwise filter by zone (treating null/empty as the
  // unassigned bucket).
  const visibleTables = useMemo(() => {
    if (effectiveZone === ZONE_ALL) return tables;
    if (effectiveZone === ZONE_UNASSIGNED) return tables.filter(t => !t.zone || !t.zone.trim());
    return tables.filter(t => t.zone === effectiveZone);
  }, [tables, effectiveZone]);

  // Canvas size adapts to the rightmost/bottommost table in the visible set
  // so large floor plans don't pile tables on top of each other. We floor at
  // the original 860×580 so a sparse layout still looks airy.
  const canvasSize = useMemo(() => {
    let maxX = CANVAS_MIN_W - CANVAS_PAD_X;
    let maxY = CANVAS_MIN_H - CANVAS_PAD_Y;
    for (const t of visibleTables) {
      if (t.x > maxX) maxX = t.x;
      if (t.y > maxY) maxY = t.y;
    }
    return {
      width:  Math.max(CANVAS_MIN_W, Math.ceil(maxX + CANVAS_PAD_X)),
      height: Math.max(CANVAS_MIN_H, Math.ceil(maxY + CANVAS_PAD_Y)),
    };
  }, [visibleTables]);

  const stats = useMemo(() => ({
    available: visibleTables.filter(t => t.status === 'available').length,
    occupied:  visibleTables.filter(t => t.status === 'occupied').length,
  }), [visibleTables]);

  const activeZoneLabel =
    effectiveZone === ZONE_ALL ? 'Όλες οι ζώνες'
      : effectiveZone === ZONE_UNASSIGNED ? 'Χωρίς ζώνη'
      : effectiveZone;

  const reservationByTable = useMemo(() => {
    const map = new Map<string, Reservation>();
    for (const r of reservations) {
      if (r.table_id && r.status !== 'cancelled' && r.status !== 'completed') {
        map.set(r.table_id, r);
      }
    }
    return map;
  }, [reservations]);

  if (tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[#6B7280] text-sm">
        Δεν υπάρχουν τραπέζια. Προσθέστε τραπέζια στις Ρυθμίσεις.
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full max-w-full">
      {/* Floor Plan Canvas */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 max-w-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <LayoutGrid size={15} className="text-[#6B7280]" />
            <span className="text-[13px] font-semibold text-[#0A0A0A] tracking-tight">Κάτοψη Εστιατορίου</span>
            <span className="text-[12px] text-[#6B7280]">· {visibleTables.length}/{tables.length} τραπέζια</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                live ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[#F8F8F8] text-[#6B7280]'
              }`}
              title={live ? 'Συνδεδεμένο σε πραγματικό χρόνο' : 'Σύνδεση...'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-[#9CA3AF]'}`} />
              {live ? 'Ζωντανό' : 'Σύνδεση...'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={resetZoom} className="p-1.5 rounded-md hover:bg-[#F8F8F8] text-[#6B7280] hover:text-[#0A0A0A]" title="Επαναφορά ζουμ">
              <RotateCcw size={14} />
            </button>
            <button onClick={zoomOut} className="p-1.5 rounded-md hover:bg-[#F8F8F8] text-[#6B7280] hover:text-[#0A0A0A]">
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] font-medium text-[#6B7280] w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={zoomIn} className="p-1.5 rounded-md hover:bg-[#F8F8F8] text-[#6B7280] hover:text-[#0A0A0A]">
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        {/* Zone tabs — only rendered when the operator has more than one zone
            in use. A single-zone restaurant doesn't need the chrome. */}
        {zoneList.length > 1 && (
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveZone(ZONE_ALL)}
              className={cn(
                'px-3 py-1.5 rounded-md text-[12px] font-bold whitespace-nowrap transition-colors',
                effectiveZone === ZONE_ALL
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-white text-[#0A0A0A] border border-[#E5E7EB] hover:bg-[#F8F8F8]',
              )}
            >
              Όλες <span className="ml-1 opacity-70 tabular-nums">{tables.length}</span>
            </button>
            {zoneList.map(([key, count]) => {
              const label = key === ZONE_UNASSIGNED ? 'Χωρίς ζώνη' : key;
              const isActive = effectiveZone === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveZone(key)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-[12px] font-bold whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-[#0A0A0A] text-white'
                      : 'bg-white text-[#0A0A0A] border border-[#E5E7EB] hover:bg-[#F8F8F8]',
                  )}
                >
                  {label} <span className="ml-1 opacity-70 tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Canvas — size grows with the visible tables so large floor plans
            don't overlap. Min 860×580 to keep the airy look on small layouts. */}
        <div className="flex-1 rounded-lg border border-white/10 overflow-auto max-w-full flex justify-center" style={{ background: '#0F0F0F' }}>
          <div
            className="relative min-h-full flex-shrink-0"
            style={{
              width: `${canvasSize.width * zoom}px`,
              height: `${canvasSize.height * zoom}px`,
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            {/* Full-size dashed dining-zone box */}
            <div
              className="absolute inset-4 rounded-lg border-2 border-dashed pointer-events-none"
              style={{ borderColor: 'rgba(255,255,255,0.10)' }}
            />

            {/* Zone label — reflects the active tab so the canvas is honest
                about what it's showing. Hidden when there's no real zone
                context (single-zone restaurant on "Όλες"). */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {activeZoneLabel}
              </span>
            </div>

            {/* ΕΙΣΟΔΟΣ marker — centered along the bottom of the zone */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
              <div className="w-16 h-[3px] bg-[#F97316] rounded-full" style={{ boxShadow: '0 0 12px rgba(249,115,22,0.5)' }} />
              <span className="text-[10px] text-[#F97316] uppercase tracking-[0.18em] font-bold">Είσοδος</span>
            </div>

            {visibleTables.map(table => (
              <TableNode
                key={table.id}
                table={table}
                isSelected={selectedTable?.id === table.id}
                onClick={handleTableClick}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-1 flex-wrap">
          {LEGEND.map(item => (
            <div key={item.status} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} style={{ boxShadow: `0 0 8px currentColor` }} />
              <span className="text-[12px] text-[#6B7280] font-medium">{item.label}: <span className="text-[#0A0A0A] font-bold tabular-nums">{stats[item.status]}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Side Panel */}
      {selectedTable && (
        <TableDetailPanel
          table={selectedTable}
          reservation={reservationByTable.get(selectedTable.id)}
          isPending={pending.has(selectedTable.id)}
          onClose={closePanel}
          onFree={handleFree}
          onRequestOccupy={handleRequestOccupy}
        />
      )}

      {occupyTarget && (
        <OccupyModal
          tableNumber={occupyTarget.number}
          seats={occupyTarget.seats}
          onPick={handleConfirmOccupy}
          onClose={() => setOccupyTarget(null)}
        />
      )}
    </div>
  );
}
