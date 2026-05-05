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
            <div key={i} className="bg-white rounded-lg border-2 border-[#F97316] p-5 shadow-card">
              <div className="h-3 w-20 bg-[#F8F8F8] rounded mb-3" />
              <div className="h-8 w-24 bg-[#F8F8F8] rounded" />
              <div className="h-3 w-32 bg-[#F8F8F8] rounded mt-3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-card p-4" style={{ minHeight: 520 }}>
          <div className="h-full rounded-lg" style={{ background: '#0F0F0F' }} />
        </div>
      </div>
    </div>
  );
}
