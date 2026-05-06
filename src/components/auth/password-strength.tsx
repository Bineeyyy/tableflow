'use client';

import { cn } from '@/lib/utils';

// Lightweight strength heuristic — six binary signals collapsed to four
// buckets. zxcvbn would be more accurate but adds ~150KB gzipped, which is
// disproportionate for an auth form on a public landing. The point of the
// indicator is to nudge users away from "12345678", not to gate registration
// on entropy estimates.
function score(password: string): number {
  if (!password) return 0;
  let s = 0;
  if (password.length >= 8) s++;
  if (password.length >= 12) s++;
  if (/[a-z]/.test(password)) s++;
  if (/[A-Z]/.test(password)) s++;
  if (/\d/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  return s; // 0..6
}

const LEVELS = [
  { label: 'Πολύ αδύναμος',  filled: 1, color: 'bg-[#EF4444]', text: 'text-[#FCA5A5]' },
  { label: 'Αδύναμος',       filled: 1, color: 'bg-[#EF4444]', text: 'text-[#FCA5A5]' },
  { label: 'Μέτριος',        filled: 2, color: 'bg-[#F97316]', text: 'text-[#FBBF24]' },
  { label: 'Καλός',          filled: 3, color: 'bg-[#FBBF24]', text: 'text-[#FBBF24]' },
  { label: 'Δυνατός',        filled: 4, color: 'bg-[#10B981]', text: 'text-[#34D399]' },
  { label: 'Πολύ δυνατός',   filled: 4, color: 'bg-[#10B981]', text: 'text-[#34D399]' },
  { label: 'Πολύ δυνατός',   filled: 4, color: 'bg-[#10B981]', text: 'text-[#34D399]' },
] as const;

export function PasswordStrength({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  // Don't render anything for an empty input — avoids a "Πολύ αδύναμος"
  // shaming the user before they've started typing.
  if (!password) return null;
  const level = LEVELS[score(password)];
  return (
    <div className={cn('mt-2 flex items-center gap-3', className)}>
      <div className="flex gap-1 flex-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              i < level.filled ? level.color : 'bg-white/10',
            )}
          />
        ))}
      </div>
      <span className={cn('text-[11px] font-semibold tabular-nums', level.text)}>
        {level.label}
      </span>
    </div>
  );
}
