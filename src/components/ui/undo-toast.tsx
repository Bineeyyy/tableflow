'use client';

import { useEffect, useState } from 'react';
import { Undo2, X } from 'lucide-react';
import type { UndoPending } from '@/hooks/use-undo-action';

interface Props {
  pending: UndoPending | null;
  undo: () => void;
  delayMs: number;
}

// A countdown bar reads better than a numeric timer at this duration — users
// see "still time to undo" without parsing a number. Driven by requestAnimationFrame
// so it's smooth on long delays and stops itself when pending clears.
function CountdownBar({ startedAt, delayMs }: { startedAt: number; delayMs: number }) {
  const [pct, setPct] = useState(100);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 1 - elapsed / delayMs);
      setPct(remaining * 100);
      if (remaining > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAt, delayMs]);
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 overflow-hidden">
      <div
        className="h-full bg-[#F97316] transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function UndoToast({ pending, undo, delayMs }: Props) {
  if (!pending) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] min-w-[280px] max-w-[90vw] rounded-lg shadow-2xl bg-[#0A0A0A] text-white overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex-1 text-[13px] font-semibold truncate">{pending.label}</span>
        <button
          onClick={undo}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[#F97316] text-[12px] font-bold transition-colors"
        >
          <Undo2 size={13} strokeWidth={2.4} />
          Αναίρεση
        </button>
        <button
          onClick={undo}
          aria-label="Κλείσιμο"
          className="text-white/40 hover:text-white p-1 rounded-md hover:bg-white/5"
        >
          <X size={14} />
        </button>
      </div>
      <CountdownBar startedAt={pending.startedAt} delayMs={delayMs} />
    </div>
  );
}
