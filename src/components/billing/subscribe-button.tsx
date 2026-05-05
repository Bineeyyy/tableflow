'use client';

import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SubscribeButton({ plan, className }: { plan: string; className?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
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
        alert(`Σφάλμα checkout (HTTP ${res.status}). Δοκιμάστε ξανά.`);
        return;
      }
      if (!res.ok || payload.error || !payload.url) {
        alert(payload.error ?? `Σφάλμα checkout (HTTP ${res.status})`);
        return;
      }
      window.location.href = payload.url;
    } catch (err) {
      console.error('[subscribe] checkout failed', err);
      alert('Δεν ήταν δυνατή η σύνδεση με τον server. Δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'w-full py-3 rounded-lg text-[13px] font-bold tracking-tight transition-all active:scale-[0.98]',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        className,
      )}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 size={15} className="animate-spin" />
          Ανακατεύθυνση...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <Zap size={15} />
          Αναβάθμιση σε Pro
        </span>
      )}
    </button>
  );
}
