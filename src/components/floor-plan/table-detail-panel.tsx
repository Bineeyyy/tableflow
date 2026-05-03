'use client';

import { Table, TableStatus, Reservation } from '@/types';
import { getStatusLabel, formatCurrency, cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/badge';
import {
  Users, Clock, X, ChefHat, CheckCircle, Sparkles,
  CalendarClock, Phone, MessageSquare,
} from 'lucide-react';

const STATUS_ACTIONS: Record<TableStatus, { label: string; next: TableStatus; icon: React.ReactNode; color: string }[]> = {
  available: [
    { label: 'Κράτηση',          next: 'reserved',  icon: <CalendarClock size={14} />, color: 'bg-amber-500 hover:bg-amber-600'   },
    { label: 'Εισαγωγή Πελατών', next: 'occupied',  icon: <Users size={14} />,         color: 'bg-red-500 hover:bg-red-600'       },
  ],
  occupied: [
    { label: 'Κλείσιμο Λογαριασμού', next: 'cleaning', icon: <CheckCircle size={14} />, color: 'bg-emerald-600 hover:bg-emerald-700' },
  ],
  reserved: [
    { label: 'Άφιξη Πελατών',    next: 'occupied',  icon: <Users size={14} />, color: 'bg-red-500 hover:bg-red-600'   },
    { label: 'Ακύρωση Κράτησης', next: 'available', icon: <X size={14} />,     color: 'bg-stone-500 hover:bg-stone-600' },
  ],
  cleaning: [
    { label: 'Ολοκλήρωση Καθαρισμού', next: 'available', icon: <Sparkles size={14} />, color: 'bg-emerald-600 hover:bg-emerald-700' },
  ],
};

interface TableDetailPanelProps {
  table: Table;
  reservation?: Reservation;
  onClose: () => void;
  onStatusChange: (tableId: string, status: TableStatus) => void;
}

export function TableDetailPanel({ table, reservation, onClose, onStatusChange }: TableDetailPanelProps) {
  const actions = STATUS_ACTIONS[table.status];

  return (
    <div className="w-80 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="bg-gradient-to-br from-terracotta to-terracotta-dark p-5 text-white relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={16} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <ChefHat size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Τραπέζι {table.number}</h3>
            {table.label && <p className="text-sm text-white/80">{table.label}</p>}
            <div className="flex items-center gap-1 mt-1">
              <Users size={12} className="text-white/70" />
              <span className="text-sm text-white/80">{table.seats} θέσεις</span>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <StatusBadge status={table.status} className="!bg-white/20 !text-white !border-white/30" />
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Reservation info */}
        {reservation ? (
          <div className="bg-amber-50 rounded-xl p-4 space-y-2 border border-amber-100">
            <h4 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">Κράτηση</h4>
            <p className="font-medium text-stone-800">{reservation.name}</p>
            <div className="flex items-center gap-3 text-sm text-stone-500">
              <span className="flex items-center gap-1"><Clock size={13} />{reservation.time}</span>
              <span className="flex items-center gap-1"><Users size={13} />{reservation.guests} άτομα</span>
            </div>
            {reservation.phone && (
              <p className="flex items-center gap-1 text-sm text-stone-500">
                <Phone size={13} />{reservation.phone}
              </p>
            )}
            {reservation.notes && (
              <p className="flex items-center gap-1 text-sm text-stone-400 italic">
                <MessageSquare size={13} />"{reservation.notes}"
              </p>
            )}
          </div>
        ) : (
          <div className="bg-stone-50 rounded-xl p-4 text-center text-stone-400 text-sm">
            {table.status === 'available'  ? 'Δεν υπάρχει ενεργή κράτηση' :
             table.status === 'occupied'   ? 'Τραπέζι σε χρήση'          :
             table.status === 'cleaning'   ? 'Σε διαδικασία καθαρισμού'  :
                                             'Δεν υπάρχει κράτηση'}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Ενέργειες</h4>
          {actions.map((action) => (
            <button
              key={action.next}
              onClick={() => onStatusChange(table.id, action.next)}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
                'text-white text-sm font-medium transition-all duration-150 active:scale-95',
                action.color,
              )}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
