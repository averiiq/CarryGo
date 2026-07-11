export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-48 skeleton rounded-lg" />
        <div className="h-4 w-72 skeleton rounded-lg mt-2" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="rounded-2xl bg-surface p-6 shadow-[var(--shadow-bento)] border border-border-subtle">
            <div className="h-4 w-20 skeleton rounded-lg" />
            <div className="h-8 w-14 skeleton rounded-lg mt-3" />
            <div className="h-8 w-full skeleton rounded-lg mt-4" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-surface border border-border-subtle shadow-[var(--shadow-bento)] p-6">
        <div className="h-5 w-32 skeleton rounded-lg mb-4" />
        <div className="h-[320px] skeleton rounded-xl" />
      </div>
    </div>
  )
}
