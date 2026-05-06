'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Table, TableStatus, Reservation } from '@/types';
import type { Tables } from '@/types/database.types';
import { TableNode } from './table-node';
import { TableDetailPanel } from './table-detail-panel';
import { OccupyModal } from '@/components/ui/occupy-modal';
import { setTableOccupancy } from '@/app/actions/waiter';
import { createClient } from '@/lib/supabase/client';
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

// Half-extent of each table shape (px). Mirrors the size classes in TableNode.
function halfSize(shape: Table['shape']): readonly [number, number] {
  if (shape === 'rectangle') return [56, 32];
  if (shape === 'round')     return [32, 32];
  return [40, 40]; // square
}

export function FloorPlan({ initialTables, restaurantId, todayReservations }: FloorPlanProps) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [reservations, setReservations] = useState<Reservation[]>(todayReservations);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [zoom, setZoom] = useState(1);
  const [occupyTarget, setOccupyTarget] = useState<Table | null>(null);
  const [live, setLive] = useState(false);
  // Per-table in-flight set. Mirrors the guard the mobile FloorTab uses:
  // rapid double/triple taps would otherwise queue parallel server actions
  // whose final state is decided by whichever round-trip resolves last.
  const [pending, setPending] = useState<Set<string>>(new Set());

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
            return;
          }
          const row = mapTable(payload.new as DbTable);
          setTables(prev => {
            const idx = prev.findIndex(t => t.id === row.id);
            if (idx === -1) return [...prev, row].sort((a, b) => a.number - b.number);
            const next = prev.slice(); next[idx] = row; return next;
          });
          setSelectedTable(prev => prev?.id === row.id ? row : prev);
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
          // Floor plan badges only reflect today's reservations. If a row was
          // edited to a different date, drop it from local state.
          const today = new Date().toISOString().split('T')[0];
          if (row.date !== today) {
            setReservations(prev => prev.filter(r => r.id !== row.id));
            return;
          }
          setReservations(prev => {
            const idx = prev.findIndex(r => r.id === row.id);
            if (idx === -1) return [...prev, row].sort((a, b) => a.time.localeCompare(b.time));
            const next = prev.slice(); next[idx] = row; return next;
          });
        },
      )
      .subscribe(status => setLive(status === 'SUBSCRIBED'));

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

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

  const stats = useMemo(() => ({
    available: tables.filter(t => t.status === 'available').length,
    occupied:  tables.filter(t => t.status === 'occupied').length,
  }), [tables]);

  const reservationByTable = useMemo(() => {
    const map = new Map<string, Reservation>();
    for (const r of reservations) {
      if (r.table_id && r.status !== 'cancelled' && r.status !== 'completed') {
        map.set(r.table_id, r);
      }
    }
    return map;
  }, [reservations]);

  // Auto-fit canvas: bounding box of all tables → zone → labels around it
  const layout = useMemo(() => {
    const PAD = 48;          // breathing room inside the zone, around tables
    const SIDE_PAD = 32;     // canvas margin left/right of the zone
    const TOP_LABEL_H = 36;  // canvas margin above the zone (for "ΑΙΘΟΥΣΑ")
    const BOT_LABEL_H = 60;  // canvas margin below the zone (for "ΕΙΣΟΔΟΣ" marker)

    if (tables.length === 0) {
      const zoneW = 480, zoneH = 280;
      return {
        baseW: SIDE_PAD * 2 + zoneW,
        baseH: TOP_LABEL_H + zoneH + BOT_LABEL_H,
        zoneX: SIDE_PAD,
        zoneY: TOP_LABEL_H,
        zoneW,
        zoneH,
        offsetX: 0,
        offsetY: 0,
      };
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const t of tables) {
      const [hw, hh] = halfSize(t.shape);
      if (t.x - hw < minX) minX = t.x - hw;
      if (t.x + hw > maxX) maxX = t.x + hw;
      if (t.y - hh < minY) minY = t.y - hh;
      if (t.y + hh > maxY) maxY = t.y + hh;
    }

    const zoneW = (maxX - minX) + PAD * 2;
    const zoneH = (maxY - minY) + PAD * 2;
    const baseW = SIDE_PAD * 2 + zoneW;
    const baseH = TOP_LABEL_H + zoneH + BOT_LABEL_H;

    return {
      baseW,
      baseH,
      zoneX: SIDE_PAD,
      zoneY: TOP_LABEL_H,
      zoneW,
      zoneH,
      offsetX: SIDE_PAD + PAD - minX,
      offsetY: TOP_LABEL_H + PAD - minY,
    };
  }, [tables]);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid size={15} className="text-[#6B7280]" />
            <span className="text-[13px] font-semibold text-[#0A0A0A] tracking-tight">Κάτοψη Εστιατορίου</span>
            <span className="text-[12px] text-[#6B7280]">· {tables.length} τραπέζια</span>
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

        {/* Canvas — dark, content auto-fits & is centered */}
        <div className="flex-1 rounded-lg border border-white/10 overflow-auto max-w-full" style={{ background: '#0F0F0F' }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: `${layout.baseW * zoom}px`,
              height: `${layout.baseH * zoom}px`,
              minWidth: '100%',
              minHeight: '100%',
            }}
          >
            <div
              className="relative flex-shrink-0"
              style={{
                width: `${layout.baseW}px`,
                height: `${layout.baseH}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            >
              {/* Dashed dining-zone box (auto-sized to all tables) */}
              <div
                className="absolute rounded-lg border-2 border-dashed pointer-events-none"
                style={{
                  left: layout.zoneX,
                  top: layout.zoneY,
                  width: layout.zoneW,
                  height: layout.zoneH,
                  borderColor: 'rgba(255,255,255,0.10)',
                }}
              />

              {/* ΑΙΘΟΥΣΑ — centered above the zone */}
              <div
                className="absolute pointer-events-none flex justify-center"
                style={{ left: layout.zoneX, top: layout.zoneY - 24, width: layout.zoneW }}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Αίθουσα
                </span>
              </div>

              {/* ΕΙΣΟΔΟΣ marker — centered below the zone */}
              <div
                className="absolute pointer-events-none flex flex-col items-center gap-1"
                style={{ left: layout.zoneX, top: layout.zoneY + layout.zoneH + 14, width: layout.zoneW }}
              >
                <div className="w-16 h-[3px] bg-[#F97316] rounded-full" style={{ boxShadow: '0 0 12px rgba(249,115,22,0.5)' }} />
                <span className="text-[10px] text-[#F97316] uppercase tracking-[0.18em] font-bold">Είσοδος</span>
              </div>

              {/* Tables — shifted so the bounding box aligns with the zone interior */}
              <div className="absolute" style={{ left: layout.offsetX, top: layout.offsetY }}>
                {tables.map(table => (
                  <TableNode
                    key={table.id}
                    table={table}
                    isSelected={selectedTable?.id === table.id}
                    onClick={handleTableClick}
                  />
                ))}
              </div>
            </div>
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
