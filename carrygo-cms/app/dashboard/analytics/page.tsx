import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import { BarChart3, Users, TrendingUp, Clock, Star, Route } from 'lucide-react'
import AnalyticsCard from '@/components/AnalyticsCard'
import DashboardChart from '@/components/DashboardChart'

interface RouteData {
  from_city: string
  to_city: string
  count: number
}

export default async function AnalyticsPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })

  const { count: completedDeliveries } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  const { count: failedDeliveries } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed')

  const totalDeliveries = (completedDeliveries ?? 0) + (failedDeliveries ?? 0)
  const successRate = totalDeliveries > 0
    ? Math.round(((completedDeliveries ?? 0) / totalDeliveries) * 100)
    : 0

  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'released')

  const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0

  const { data: topTravellers } = await supabase
    .from('user_profiles')
    .select('id, full_name, rating, total_deliveries')
    .order('rating', { ascending: false })
    .limit(5)

  // User growth: last 12 weeks
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)

  const { data: recentUsers } = await supabase
    .from('user_profiles')
    .select('created_at')
    .gte('created_at', twelveWeeksAgo.toISOString())

  const weeklyGrowth: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    const weekLabel = `W${12 - i}`
    weeklyGrowth[weekLabel] = 0
  }

  recentUsers?.forEach(u => {
    const created = new Date(u.created_at)
    const now = new Date()
    const weeksAgo = Math.floor((now.getTime() - created.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const weekLabel = `W${12 - Math.min(weeksAgo, 11)}`
    if (weeklyGrowth[weekLabel] !== undefined) weeklyGrowth[weekLabel]++
  })

  const growthData = Object.entries(weeklyGrowth).map(([name, users]) => ({
    name,
    trips: users,
    parcels: 0,
  }))

  // Popular routes
  const { data: tripRoutes } = await supabase
    .from('trips')
    .select('from_city, to_city')
    .eq('status', 'active')

  const routeCounts: Record<string, RouteData> = {}
  tripRoutes?.forEach(t => {
    const key = `${t.from_city}→${t.to_city}`
    if (!routeCounts[key]) routeCounts[key] = { from_city: t.from_city, to_city: t.to_city, count: 0 }
    routeCounts[key].count++
  })
  const popularRoutes = Object.values(routeCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500">Deep insights into platform performance and growth.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard
          title="Total Users"
          value={totalUsers ?? 0}
          trend="up"
          change={12}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <AnalyticsCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          trend="up"
          change={8}
          icon={TrendingUp}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <AnalyticsCard
          title="Success Rate"
          value={`${successRate}%`}
          trend={successRate >= 80 ? 'up' : 'down'}
          change={successRate >= 80 ? 3 : -2}
          icon={BarChart3}
          color="text-violet-600"
          bgColor="bg-violet-50"
        />
        <AnalyticsCard
          title="Completed"
          value={completedDeliveries ?? 0}
          trend="up"
          change={15}
          icon={Clock}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
      </div>

      {/* User Growth Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">User Growth</h2>
          <p className="text-sm text-gray-500">New user signups over the last 12 weeks.</p>
        </div>
        <DashboardChart data={growthData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Routes */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Route className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Popular Routes</h2>
          </div>
          <div className="space-y-3">
            {popularRoutes.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No route data yet</p>
            ) : (
              popularRoutes.map((route, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                    <span className="text-sm font-medium text-gray-800">
                      {route.from_city} → {route.to_city}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    {route.count} trips
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Travellers */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Top Travellers</h2>
          </div>
          <div className="space-y-3">
            {!topTravellers || topTravellers.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No traveller data yet</p>
            ) : (
              topTravellers.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-700">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{t.total_deliveries ?? 0} deliveries</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-semibold text-gray-700">{(t.rating ?? 0).toFixed(1)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
