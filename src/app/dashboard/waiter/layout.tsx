// The waiter view is mobile-first and takes over the screen. It still lives
// under /dashboard so the auth + subscription guards in proxy.ts apply, but
// we override the parent's sidebar layout here.
export default function WaiterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A] overflow-hidden">
      {children}
    </div>
  );
}
