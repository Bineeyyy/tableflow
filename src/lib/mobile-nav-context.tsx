'use client';

import { createContext, useContext, useState } from 'react';

type Ctx = { open: boolean; setOpen: (v: boolean) => void };

const MobileNavCtx = createContext<Ctx | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MobileNavCtx.Provider value={{ open, setOpen }}>{children}</MobileNavCtx.Provider>;
}

export function useMobileNav(): Ctx {
  const ctx = useContext(MobileNavCtx);
  // Used outside a dashboard layout (e.g. waiter route): no-op state.
  if (!ctx) return { open: false, setOpen: () => {} };
  return ctx;
}
