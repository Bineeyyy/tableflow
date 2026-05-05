'use client';

import { Table, TableStatus, Reservation } from '@/types';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/badge';
import {
  Users, Clock, X, ChefHat, CheckCircle, Sparkles,
  CalendarClock, Phone, MessageSquare,
} from 'lucide-react';

const STATUS_ACTIONS: Record<TableStatus, { label: string; next: TableStatus; icon: React.ReactNode; color: string }[]> = {
  available: [
    { label: 'Κράτηση',          next: 'reserved',  icon: <CalendarClock size={14} />, color: 'bg-[#F97316] hover:bg-[#EA580C]' },
    { label: 'Εισαγωγή Πελατών', next: 'occupied',  icon: <Users size={14} />,         color: 'bg-[#0A0A0A] hover:bg-black' },
  ],
  occupied: [
    { label: 'Κλείσιμο Λογαριασμού', next: 'cleaning', icon: <CheckCircle size={14} />, color: 'bg-[#10B981] hover:bg-[#059669]' },
  ],
  reserved: [
    { label: 'Άφιξη Πελατών',    next: 'occupied',  icon: <Users size={14} />, color: 'bg-[#0A0A0A] hover:bg-black' },
    { label: 'Ακύρωση Κράτησης', next: 'available', icon: <X size={14} />,     color: 'bg-white text-[#0A0A0A] border border-[#E5E7EB] hover:bg-[#F8F8F8]' },
  ],
  cleaning: [
    { label: 'Ολοκλήρωση Καθαρισμού', next: 'available', icon: <Sparkles size={14} />, color: 'bg-[#10B981] hover:bg-[#059669]' },
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
    <div className="w-full lg:w-80 lg:flex-shrink-0 bg-white rounded-lg shadow-pop border border-[#E5E7EB] overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {/* Header — pure black */}
      <div className="bg-[#0A0A0A] p-5 text-white relative">
        <span aria-hidden className="absolute top-0 left-0 right-0 h-[3px] bg-[#F97316]" />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-[#F97316] flex items-center justify-center">
            <ChefHat size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-[18px] font-bold tracking-tight leading-tight">Τραπέζι {table.number}</h3>
            {table.label && <p className="text-[12px] text-white/60 mt-0.5">{table.label}</p>}
            <div className="flex items-center gap-1 mt-1">
              <Users size={12} className="text-white/50" />
              <span className="text-[12px] text-white/70">{table.seats} θέσεις</span>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <StatusBadge status={table.status} />
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Reservation info */}
        {reservation ? (
          <div className="bg-[#FFF4ED] rounded-lg p-4 space-y-2 border border-[#F97316]/20">
            <h4 className="text-[10px] font-bold text-[#C2410C] uppercase tracking-[0.1em]">Κράτηση</h4>
            <p className="font-bold text-[#0A0A0A] tracking-tight">{reservation.name}</p>
            <div className="flex items-center gap-3 text-[12px] text-[#6B7280] font-medium">
              <span className="flex items-center gap-1"><Clock size={13} />{reservation.time}</span>
              <span className="flex items-center gap-1"><Users size={13} />{reservation.guests} άτομα</span>
            </div>
            {reservation.phone && (
              <p className="flex items-center gap-1 text-[12px] text-[#6B7280]">
                <Phone size={13} />{reservation.phone}
              </p>
            )}
            {reservation.notes && (
              <p className="flex items-center gap-1 text-[12px] text-[#6B7280] italic">
                <MessageSquare size={13} />&ldquo;{reservation.notes}&rdquo;
              </p>
            )}
          </div>
        ) : (
          <div className="bg-[#F8F8F8] rounded-lg p-4 text-center text-[#6B7280] text-[12px] border border-[#E5E7EB]">
            {table.status === 'available'  ? 'Δεν υπάρχει ενεργή κράτηση' :
             table.status === 'occupied'   ? 'Τραπέζι σε χρήση'          :
             table.status === 'cleaning'   ? 'Σε διαδικασία καθαρισμού'  :
                                             'Δεν υπάρχει κράτηση'}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.1em]">Ενέργειες</h4>
          {actions.map((action) => (
            <button
              key={action.next}
              onClick={() => onStatusChange(table.id, action.next)}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
                'text-white text-[13px] font-semibold transition-all duration-150 active:scale-[0.98]',
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
