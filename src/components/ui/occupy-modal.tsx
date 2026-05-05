'use client';

import { useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const COMMON_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];

type Props = {
  tableNumber: number;
  seats: number;
  busy?: boolean;
  onPick: (guests: number) => void;
  onClose: () => void;
};

export function OccupyModal({ tableNumber, seats, busy, onPick, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[#0A0A0A] border-t sm:border border-white/10 sm:rounded-2xl rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom duration-200"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#F97316]" />
            <h2 className="text-[16px] font-extrabold text-white tracking-tight">
              Τραπέζι {tableNumber}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>
        <p className="text-[12px] text-white/50 mb-5">Πόσα άτομα; (μέγ. {seats})</p>

        <div className="grid grid-cols-4 gap-2.5">
          {COMMON_SIZES.map(n => {
            const disabled = busy || n > seats;
            return (
              <button
                key={n}
                onClick={() => onPick(n)}
                disabled={disabled}
                className={cn(
                  'aspect-square rounded-xl border text-[28px] font-extrabold tabular-nums transition-all active:scale-95',
                  disabled
                    ? 'bg-white/[0.03] border-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-white/5 border-white/10 text-white hover:bg-[#F97316] hover:border-[#F97316]'
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
