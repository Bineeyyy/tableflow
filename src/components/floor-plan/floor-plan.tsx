'use client';

import { useState } from 'react';
import { Table, TableStatus, Reservation } from '@/types';
import { TableNode } from './table-node';
import { TableDetailPanel } from './table-detail-panel';
import { updateTableStatus } from '@/lib/supabase/queries';
import { LayoutGrid, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const LEGEND = [
  { status: 'available' as TableStatus, label: 'Διαθέσιμο',    color: 'bg-[#10B981]' },
  { status: 'occupied'  as TableStatus, label: 'Κατειλημμένο', color: 'bg-[#EF4444]' },
  { status: 'reserved'  as TableStatus, label: 'Κρατημένο',    color: 'bg-[#F97316]' },
  { status: 'cleaning'  as TableStatus, label: 'Καθαρισμός',   color: 'bg-[#3B82F6]' },
];

interface FloorPlanProps {
  initialTables: Table[];
  restaurantId: string;
  todayReservations: Reservation[];
}

export function FloorPlan({ initialTables, todayReservations }: FloorPlanProps) {
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
      <div className="flex h-full items-center justify-center text-[#6B7280] text-sm">
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
            <LayoutGrid size={15} className="text-[#6B7280]" />
            <span className="text-[13px] font-semibold text-[#0A0A0A] tracking-tight">Κάτοψη Εστιατορίου</span>
            <span className="text-[12px] text-[#6B7280]">· {tables.length} τραπέζια</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(1)} className="p-1.5 rounded-md hover:bg-[#F8F8F8] text-[#6B7280] hover:text-[#0A0A0A] transition-colors" title="Επαναφορά ζουμ">
              <RotateCcw size={14} />
            </button>
            <button onClick={() => setZoom(z => Math.max(0.6, z - 0.1))} className="p-1.5 rounded-md hover:bg-[#F8F8F8] text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] font-medium text-[#6B7280] w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1.8, z + 0.1))} className="p-1.5 rounded-md hover:bg-[#F8F8F8] text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-[#FAFAFA] rounded-lg border border-[#E5E7EB] overflow-auto">
          <div
            className="relative min-h-full"
            style={{
              width: `${860 * zoom}px`,
              height: `${580 * zoom}px`,
              backgroundImage: `radial-gradient(circle, #D1D5DB40 1px, transparent 1px)`,
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <div className="absolute inset-4 rounded-lg border-2 border-dashed border-[#E5E7EB] bg-white/60" style={{ width: 840, height: 560 }} />
            <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-[0.18em]">
              Αίθουσα
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
              <div className="w-16 h-[3px] bg-[#F97316] rounded-full" />
              <span className="text-[10px] text-[#F97316] uppercase tracking-[0.18em] font-semibold">Είσοδος</span>
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
              <span className="text-[12px] text-[#6B7280] font-medium">{item.label}: <span className="text-[#0A0A0A] font-semibold">{stats[item.status]}</span></span>
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
