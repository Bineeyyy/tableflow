'use client';

import { useState } from 'react';
import { Settings2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PortalButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  // Inline error so a portal failure (Stripe down, missing customer)
  // surfaces in the design system instead of a native alert dialog.
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portal', { method: 'POST' });
      const { url, error: payloadError } = await res.json();
      if (payloadError || !url) {
        setError(payloadError ?? 'Σφάλμα κατά τη σύνδεση με το πύλη συνδρομών');
        return;
      }
      window.location.href = url;
    } catch (err) {
      console.error('[portal] request failed', err);
      setError('Δεν ήταν δυνατή η σύνδεση με τον server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="relative inline-flex flex-col items-end">
      <button
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'flex items-center gap-2 text-sm font-medium transition-colors',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          className,
        )}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
        Διαχείριση Συνδρομής
      </button>
      {/* Absolute-positioned so the inline flex row that owns this button
          (e.g. the payment-info card on the billing page) doesn't grow when
          an error appears. */}
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-full mt-1 text-[12px] text-[#B91C1C] font-semibold whitespace-nowrap"
        >
          {error}
        </p>
      )}
    </span>
  );
}
