'use client';

import { useState } from 'react';
import { Table, TableStatus, Reservation } from '@/types';
import { TableNode } from './table-node';
import { TableDetailPanel } from './table-detail-panel';
import { updateTableStatus } from '@/lib/supabase/queries';
import { LayoutGrid, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const LEGEND = [
  { status: 'available' as TableStatus, label: 'Διαθέσιμο',    color: 'bg-emerald-400' },
  { status: 'occupied'  as TableStatus, label: 'Κατειλημμένο', color: 'bg-red-400'     },
  { status: 'reserved'  as TableStatus, label: 'Κρατημένο',    color: 'bg-amber-400'   },
  { status: 'cleaning'  as TableStatus, label: 'Καθαρισμός',   color: 'bg-sky-400'     },
];

interface FloorPlanProps {
  initialTables: Table[];
  restaurantId: string;
  todayReservations: Reservation[];
}

export function FloorPlan({ initialTables, restaurantId, todayReservations }: FloorPlanProps) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [zoom, setZoom] = useState(1);

  const handleTableClick = (table: Table) => {
    setSelectedTable(prev => prev?.id === table.id ? null : table);
  };

  const handleStatusChange = async (tableId: string, newStatus: TableStatus) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: newStatus } : t));
    setSelectedTable(prev => prev?.id === tableId ? { ...prev, status: newStatus } : prev);
    try {
      await updateTableStatus(tableId, newStatus);
    } catch (err) {
      console.error('Failed to update table status:', err);
    }
  };

  const stats = {
    available: tables.filter(t => t.status === 'available').length,
    occupied:  tables.filter(t => t.status === 'occupied').length,
    reserved:  tables.filter(t => t.status === 'reserved').length,
    cleaning:  tables.filter(t => t.status === 'cleaning').length,
  };

  const todayReservationForTable = (tableId: string) =>
    todayReservations.find(r => r.table_id === tableId && r.status !== 'cancelled' && r.status !== 'completed');

  if (tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-stone-400 text-sm">
        Δεν υπάρχουν τραπέζια. Προσθέστε τραπέζια στις Ρυθμίσεις.
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Floor Plan Canvas */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-stone-400" />
            <span className="text-sm font-medium text-stone-600">Κάτοψη Εστιατορίου</span>
            <span className="text-xs text-stone-400">· {tables.length} τραπέζια</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setZoom(1)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors" title="Επαναφορά ζουμ">
              <RotateCcw size={14} />
            </button>
            <button onClick={() => setZoom(z => Math.max(0.6, z - 0.1))} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors">
              <ZoomOut size={14} />
            </button>
            <span className="text-xs text-stone-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1.8, z + 0.1))} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors">
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-white rounded-2xl border border-stone-200 overflow-auto shadow-inner">
          <div
            className="relative min-h-full"
            style={{
              width: `${860 * zoom}px`,
              height: `${580 * zoom}px`,
              backgroundImage: `radial-gradient(circle, #d6cfc820 1px, transparent 1px)`,
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <div className="absolute inset-4 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50" style={{ width: 840, height: 560 }} />
            <div className="absolute top-8 left-1/2 -translate-x-1/2 text-xs text-stone-300 font-medium uppercase tracking-widest">
              Αίθουσα
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
              <div className="w-16 h-1 bg-terracotta/40 rounded-full" />
              <span className="text-[10px] text-terracotta/60 uppercase tracking-widest font-medium">Είσοδος</span>
            </div>

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

        {/* Legend */}
        <div className="flex items-center gap-4 px-1">
          {LEGEND.map(item => (
            <div key={item.status} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-xs text-stone-500">{item.label}: {stats[item.status]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Side Panel */}
      {selectedTable && (
        <TableDetailPanel
          table={selectedTable}
          reservation={todayReservationForTable(selectedTable.id)}
          onClose={() => setSelectedTable(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
