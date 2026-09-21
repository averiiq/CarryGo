export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="glass-card p-5">
            <div className="h-3 w-16 skeleton rounded-md" />
            <div className="h-7 w-12 skeleton rounded-md mt-3" />
            <div className="h-8 w-full skeleton rounded-md mt-3" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="h-4 w-28 skeleton rounded-md mb-4" />
          <div className="h-[260px] skeleton rounded-xl" />
        </div>
        <div className="glass-card p-5">
          <div className="h-4 w-24 skeleton rounded-md mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-7 w-7 skeleton rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-full skeleton rounded-md" />
                  <div className="h-2 w-16 skeleton rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
