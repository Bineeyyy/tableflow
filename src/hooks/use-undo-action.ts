'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Generic "soft delete with undo" primitive. Pattern:
//   1. Caller mutates UI optimistically (already done before calling run).
//   2. Caller passes commit() (the server action) and revert() (undo handler).
//   3. We hold the commit for delayMs and surface an UndoToast.
//   4. If the user clicks Αναίρεση, we cancel the timeout and call revert().
//      Otherwise the commit fires in the background after delayMs.
//
// One pending action at a time. A new run() while another is pending flushes
// the prior action immediately (commits it, no undo opportunity), so destructive
// actions never silently queue.
export type UndoPending = {
  id: string;
  label: string;
  revert: () => void;
  commit: () => Promise<unknown>;
  startedAt: number;
};

export function useUndoAction(delayMs = 5000) {
  const [pending, setPending] = useState<UndoPending | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fire-and-forget the server action. Failure rolls back the optimistic UI
  // (user sees the row reappear plus a console error) — we don't surface
  // anything fancier because by this point the toast has already disappeared.
  const fire = useCallback((p: UndoPending) => {
    p.commit().catch(err => {
      console.error('[undo] commit failed, reverting optimistic UI:', err);
      p.revert();
    });
  }, []);

  const run = useCallback((p: Omit<UndoPending, 'startedAt'>) => {
    setPending(prev => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      // Previous action is now uninterruptible — its optimistic UI has been
      // visible long enough that the user clearly meant it. Commit synchronously
      // so the new action doesn't have to wait on it.
      if (prev) fire(prev);
      const next: UndoPending = { ...p, startedAt: Date.now() };
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setPending(cur => (cur?.id === next.id ? null : cur));
        fire(next);
      }, delayMs);
      return next;
    });
  }, [delayMs, fire]);

  const undo = useCallback(() => {
    setPending(prev => {
      if (!prev) return null;
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      prev.revert();
      return null;
    });
  }, []);

  // Page navigation / unmount: don't drop the pending action, commit it.
  // Without this, a quick "Delete then click another link" would silently
  // discard the deletion despite the optimistic UI saying otherwise.
  useEffect(() => () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    setPending(prev => {
      if (prev) fire(prev);
      return null;
    });
  }, [fire]);

  return { pending, run, undo, delayMs };
}
