export default function DashboardLoading() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Topbar skeleton */}
      <div className="h-16 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between flex-shrink-0">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-[#F8F8F8] rounded" />
          <div className="h-3 w-24 bg-[#F8F8F8] rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-32 bg-[#F8F8F8] rounded-md" />
          <div className="h-8 w-8 bg-[#F8F8F8] rounded-md" />
          <div className="h-8 w-8 bg-[#F8F8F8] rounded-md" />
        </div>
      </div>

      {/* Body skeleton */}
      <div className="flex-1 overflow-hidden p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border-2 border-[#F97316] p-5 kpi-card relative overflow-hidden">
              <span aria-hidden className="pointer-events-none absolute -top-14 -right-14 w-36 h-36 rounded-full bg-[#F97316]/[0.06] blur-2xl" />
              <div className="flex items-start justify-between gap-3 relative">
                <div className="flex-1 space-y-3">
                  <div className="h-3 w-20 bg-[#F8F8F8] rounded" />
                  <div className="h-9 w-24 bg-[#F8F8F8] rounded" />
                  <div className="h-3 w-32 bg-[#F8F8F8] rounded" />
                </div>
                <div className="w-11 h-11 rounded-lg bg-[#F97316]/30 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border-2 border-[#F97316] shadow-card p-4" style={{ minHeight: 520 }}>
          <div className="h-full rounded-lg" style={{ background: '#0F0F0F' }} />
        </div>
      </div>
    </div>
  );
}
