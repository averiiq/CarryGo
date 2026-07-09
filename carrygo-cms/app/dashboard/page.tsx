import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import { Users, Package, Navigation, TrendingUp } from 'lucide-react'
import DashboardChart from '@/components/DashboardChart'

export default async function DashboardOverview() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  // 1. Fetch real counts
  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })

  const { count: activeTrips } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: pendingParcels } = await supabase
    .from('parcels')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'matched'])

  // 2. Fetch last 7 days data for the chart
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const fromDate = sevenDaysAgo.toISOString()

  const { data: recentTrips } = await supabase
    .from('trips')
    .select('created_at')
    .gte('created_at', fromDate)

  const { data: recentParcels } = await supabase
    .from('parcels')
    .select('created_at')
    .gte('created_at', fromDate)

  // Aggregate by day of week
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const chartDataMap: Record<string, { name: string, trips: number, parcels: number }> = {}

  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dayName = days[d.getDay()]
    chartDataMap[dayName] = { name: dayName, trips: 0, parcels: 0 }
  }

  // Count trips
  recentTrips?.forEach(t => {
    const dayName = days[new Date(t.created_at).getDay()]
    if (chartDataMap[dayName]) chartDataMap[dayName].trips += 1
  })

  // Count parcels
  recentParcels?.forEach(p => {
    const dayName = days[new Date(p.created_at).getDay()]
    if (chartDataMap[dayName]) chartDataMap[dayName].parcels += 1
  })

  const chartData = Object.values(chartDataMap)

  const stats = [
    { name: 'Total Users', value: totalUsers || 0, change: 'Growing', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Active Trips', value: activeTrips || 0, change: 'Active', icon: Navigation, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Pending Parcels', value: pendingParcels || 0, change: 'Pending', icon: Package, color: 'text-violet-600', bg: 'bg-violet-50' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500">Monitor CarryGo system metrics and health in real-time.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.name} className="overflow-hidden rounded-xl bg-white px-6 py-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="truncate text-sm font-medium text-gray-500">{item.name}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{item.value}</p>
                </div>
                <div className={`rounded-lg ${item.bg} p-3`}>
                  <Icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                <span className="text-green-500 font-medium">{item.change}</span>
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Weekly Activity</h2>
          <p className="text-sm text-gray-500">New trips and parcels created over the last 7 days.</p>
        </div>
        <DashboardChart data={chartData} />
      </div>
    </div>
  )
}
