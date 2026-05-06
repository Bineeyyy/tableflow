'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Buckets matched to typical Greek-taverna service rhythm:
//   < 60min  → green   (still ordering / mains arriving)
//   60–90    → orange  (mains finished, dessert/coffee territory)
//   ≥ 90     → red     (parking — operator should consider offering bill)
// These are visual only; nothing prevents action at any duration.
type Tier = { min: number; text: string; bg: string; border: string };
const TIERS: readonly Tier[] = [
  { min:  0, text: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  { min: 60, text: 'text-orange-300',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30'  },
  { min: 90, text: 'text-red-300',     bg: 'bg-red-500/15',     border: 'border-red-500/30'     },
] as const;

function tierForMinutes(min: number): Tier {
  let chosen = TIERS[0];
  for (const t of TIERS) if (min >= t.min) chosen = t;
  return chosen;
}

// Greek-aware compact label. < 60min → "Xλ", >=60 → "Xώ Yλ" (or just "Xώ" on
// the hour). Singular/plural forms aren't strict — "λ" and "ώ" are the same
// in singular and plural Greek, which is what made these abbreviations stick.
function formatDuration(minutes: number): string {
  if (minutes < 1) return 'Μόλις τώρα';
  if (minutes < 60) return `${minutes}λ`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}ώ`;
  return `${hours}ώ ${remainder}λ`;
}

interface Props {
  seatedAt: string;
  className?: string;
  variant?: 'badge' | 'inline';
}

// Re-renders once a minute so the displayed duration stays accurate without
// forcing the entire floor plan to re-derive layout on every tick.
export function SeatedDuration({ seatedAt, className, variant = 'badge' }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const seated = new Date(seatedAt);
  const minutes = Math.max(0, Math.floor((Date.now() - seated.getTime()) / 60_000));
  const tier = tierForMinutes(minutes);

  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold tabular-nums', tier.text, className)}>
        <Clock size={11} />
        {formatDuration(minutes)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold tabular-nums',
        tier.bg,
        tier.border,
        tier.text,
        className,
      )}
    >
      <Clock size={9} strokeWidth={2.4} />
      {formatDuration(minutes)}
    </span>
  );
}
