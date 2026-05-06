'use client';

import { useState, type CSSProperties } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  plan: string;
  className?: string;
  style?: CSSProperties;
}

export function SubscribeButton({ plan, className, style }: Props) {
  const [loading, setLoading] = useState(false);
  // Inline error state so we don't fall back to window.alert(), which is
  // jarring, blocking, and ignores the rest of the design system.
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      let payload: { url?: string; error?: string } = {};
      try {
        payload = await res.json();
      } catch {
        setError(`Σφάλμα checkout (HTTP ${res.status}). Δοκιμάστε ξανά.`);
        return;
      }
      if (!res.ok || payload.error || !payload.url) {
        setError(payload.error ?? `Σφάλμα checkout (HTTP ${res.status})`);
        return;
      }
      window.location.href = payload.url;
    } catch (err) {
      console.error('[subscribe] checkout failed', err);
      setError('Δεν ήταν δυνατή η σύνδεση με τον server. Δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  }

  // Default visual treatment — orange gradient + glow. Caller can override
  // the entire look by passing className/style; base only handles layout +
  // disabled state so utilities don't conflict.
  const defaultStyle: CSSProperties = {
    background: 'linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={loading}
        style={{ ...defaultStyle, ...style }}
        className={cn(
          'w-full flex items-center justify-center gap-2 font-extrabold tracking-tight',
          'transition-transform duration-150 active:scale-[0.98]',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          // Sensible defaults — can be overridden by className
          'py-3 rounded-lg text-[13px]',
          className,
        )}
      >
        {loading ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Ανακατεύθυνση...
          </>
        ) : (
          <>
            <Zap size={16} strokeWidth={2.6} fill="currentColor" />
            Αναβάθμιση σε Pro
          </>
        )}
      </button>
      {/* Absolute so a checkout failure doesn't reflow the plan card layout.
          role=alert announces it to screen readers when it appears. */}
      {error && (
        <p
          role="alert"
          className="absolute left-0 right-0 top-full mt-2 text-[12px] text-[#B91C1C] font-semibold text-center"
        >
          {error}
        </p>
      )}
    </div>
  );
}
