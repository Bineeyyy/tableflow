'use client';

import { useState } from 'react';
import { X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createWalkin } from '@/app/actions/waiter';

const COMMON_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];

export function WalkinModal({
  onClose, onSeated,
}: { onClose: () => void; onSeated: (tableNumber: number) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (guests: number) => {
    setPicked(guests);
    setBusy(true);
    setError(null);
    const result = await createWalkin(guests);
    setBusy(false);
    if (result.error || !result.tableNumber) {
      setError(result.error ?? 'Σφάλμα');
      setPicked(null);
      return;
    }
    onSeated(result.tableNumber);
  };

  return (
    <div
      className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[390px] bg-[#0A0A0A] border-t border-white/10 rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom duration-200"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#F97316]" />
            <h2 className="text-[16px] font-extrabold text-white tracking-tight">Νέοι πελάτες</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>
        <p className="text-[12px] text-white/50 mb-5">Επίλεξε αριθμό ατόμων — αυτόματη ανάθεση τραπεζιού</p>

        <div className="grid grid-cols-4 gap-2.5">
          {COMMON_SIZES.map(n => {
            const isPicked = picked === n;
            return (
              <button
                key={n}
                onClick={() => submit(n)}
                disabled={busy}
                className={cn(
                  'aspect-square rounded-xl border text-[28px] font-extrabold tabular-nums transition-all active:scale-95',
                  isPicked
                    ? 'bg-[#F97316] border-[#F97316] text-white'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10',
                  busy && !isPicked && 'opacity-40',
                )}
              >
                {n}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 bg-red-500/15 border border-red-500/30 text-red-300 text-[12px] font-medium px-3 py-2 rounded-lg text-center">
            {error}
          </div>
        )}

        <p className="text-center text-[10px] text-white/30 mt-4 uppercase tracking-wider font-semibold">
          Πάτησε για άμεση ανάθεση
        </p>
      </div>
    </div>
  );
}
