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
      const { url, error } = await res.json();
      if (error) { alert(error); return; }
      window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95',
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
