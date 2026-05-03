'use client';

import { useState } from 'react';
import { Settings2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PortalButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/portal', { method: 'POST' });
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
        'flex items-center gap-2 text-sm font-medium transition-colors',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        className,
      )}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
      Διαχείριση Συνδρομής
    </button>
  );
}
