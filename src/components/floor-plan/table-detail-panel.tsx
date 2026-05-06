'use client';

import { Table, Reservation } from '@/types';
import { cn } from '@/lib/utils';
import {
  Users, Clock, X, ChefHat, CheckCircle, UserPlus,
  Phone, MessageSquare,
} from 'lucide-react';
import { SeatedDuration } from './seated-duration';

interface TableDetailPanelProps {
  table: Table;
  reservation?: Reservation;
  isPending?: boolean;
  onClose: () => void;
  onFree: (tableId: string) => void;
  onRequestOccupy: (table: Table) => void;
}

export function TableDetailPanel({
  table, reservation, isPending, onClose, onFree, onRequestOccupy,
}: TableDetailPanelProps) {
  const free = table.status === 'available';

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
              <span className="text-[12px] text-white/70 tabular-nums">
                {free ? `0 / ${table.seats}` : `${table.current_guests} / ${table.seats}`}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider',
            free ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300',
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', free ? 'bg-emerald-400' : 'bg-red-400')} />
            {free ? 'Ελεύθερο' : 'Κατειλημμένο'}
          </span>
          {!free && table.seated_at && <SeatedDuration seatedAt={table.seated_at} />}
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
            {free ? 'Δεν υπάρχει ενεργή κράτηση' : 'Τραπέζι σε χρήση'}
          </div>
        )}

        {/* Action — single button per state */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.1em]">Ενέργειες</h4>
          {free ? (
            <button
              onClick={() => onRequestOccupy(table)}
              disabled={isPending}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0A0A0A] hover:bg-black text-white text-[13px] font-semibold transition-all duration-150 active:scale-[0.98]',
                isPending && 'opacity-60 cursor-not-allowed',
              )}
            >
              <UserPlus size={14} />
              Εισαγωγή Πελατών
            </button>
          ) : (
            <button
              onClick={() => onFree(table.id)}
              disabled={isPending}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[13px] font-semibold transition-all duration-150 active:scale-[0.98]',
                isPending && 'opacity-60 cursor-not-allowed',
              )}
            >
              <CheckCircle size={14} />
              Αποχώρηση Πελατών
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
