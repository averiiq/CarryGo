import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import { Star } from 'lucide-react'
import AnalyticsCard from '@/components/AnalyticsCard'
import DashboardChart from '@/components/DashboardChart'
import RevenueChart from '@/components/RevenueChart'
import DeliveryFunnel from '@/components/DeliveryFunnel'
import RouteMap from '@/components/RouteMap'

interface RouteData {
  from_city: string
  to_city: string
  count: number
}

export default async function AnalyticsPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const [
    { count: totalUsers },
    { count: completedDeliveries },
    { count: failedDeliveries },
    { data: payments },
    { data: topTravellers },
    { data: tripRoutes },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('payments').select('amount, created_at, status'),
    supabase.from('user_profiles').select('id, full_name, rating, total_deliveries').order('rating', { ascending: false }).limit(5),
    supabase.from('trips').select('from_city, to_city, status'),
  ])

  const totalDeliveries = (completedDeliveries ?? 0) + (failedDeliveries ?? 0)
  const successRate = totalDeliveries > 0
    ? Math.round(((completedDeliveries ?? 0) / totalDeliveries) * 100)
    : 0

  const releasedPayments = (payments || []).filter((p: any) => p.status === 'released')
  const totalRevenue = releasedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
  const totalPayouts = Math.round(totalRevenue * 0.82)

  // Build revenue chart data (last 6 months)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now = new Date()
  const revenueData = Array.from({ length: 6 }, (_, i) => {
    const monthIndex = (now.getMonth() - 5 + i + 12) % 12
    const monthPayments = releasedPayments.filter((p: any) => {
      const d = new Date(p.created_at)
      return d.getMonth() === monthIndex
    })
    const monthRevenue = monthPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
    return {
      name: months[monthIndex],
      revenue: monthRevenue,
      payouts: Math.round(monthRevenue * 0.82),
    }
  })

  // User growth data
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)

  const { data: recentUsers } = await supabase
    .from('user_profiles')
    .select('created_at')
    .gte('created_at', twelveWeeksAgo.toISOString())

  const weeklyGrowth: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const weekLabel = `W${12 - i}`
    weeklyGrowth[weekLabel] = 0
  }

  recentUsers?.forEach((u: any) => {
    const created = new Date(u.created_at)
    const weeksAgo = Math.floor((now.getTime() - created.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const weekLabel = `W${12 - Math.min(weeksAgo, 11)}`
    if (weeklyGrowth[weekLabel] !== undefined) weeklyGrowth[weekLabel]++
  })

  const growthData = Object.entries(weeklyGrowth).map(([name, users]) => ({
    name,
    trips: users,
    parcels: 0,
  }))

  // Route analysis
  const activeRoutes = (tripRoutes || []).filter((t: any) => t.status === 'active')
  const routeCounts: Record<string, RouteData> = {}
  activeRoutes.forEach((t: any) => {
    const key = `${t.from_city}→${t.to_city}`
    if (!routeCounts[key]) routeCounts[key] = { from_city: t.from_city, to_city: t.to_city, count: 0 }
    routeCounts[key].count++
  })

  // Build origin/destination data for RouteMap
  const originCounts: Record<string, number> = {}
  const destCounts: Record<string, number> = {}
  activeRoutes.forEach((t: any) => {
    if (t.from_city) originCounts[t.from_city] = (originCounts[t.from_city] || 0) + 1
    if (t.to_city) destCounts[t.to_city] = (destCounts[t.to_city] || 0) + 1
  })

  const topOrigins = Object.entries(originCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([city, count]) => ({ city, count, type: 'origin' as const }))

  const topDestinations = Object.entries(destCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([city, count]) => ({ city, count, type: 'destination' as const }))

  // Delivery funnel from all requests
  const { data: allRequests } = await supabase
    .from('requests')
    .select('status')

  const requestStatuses = allRequests || []
  const funnelSteps = [
    { label: 'Total Requests', count: requestStatuses.length, color: 'bg-gradient-to-r from-primary to-primary/70' },
    { label: 'Matched', count: requestStatuses.filter((r: any) => ['accepted', 'in_transit', 'completed', 'failed'].includes(r.status)).length, color: 'bg-gradient-to-r from-accent to-accent/70' },
    { label: 'In Transit', count: requestStatuses.filter((r: any) => ['in_transit', 'completed'].includes(r.status)).length, color: 'bg-gradient-to-r from-warning to-warning/70' },
    { label: 'Delivered', count: requestStatuses.filter((r: any) => r.status === 'completed').length, color: 'bg-gradient-to-r from-success to-success/70' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Analytics</h1>
        <p className="text-sm text-muted mt-1">Deep insights into platform performance and growth.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard
          title="Total Users"
          value={totalUsers ?? 0}
          trend="up"
          change={12}
          iconName="Users"
          color="text-primary"
          bgColor="bg-primary-subtle"
        />
        <AnalyticsCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          trend="up"
          change={8}
          iconName="TrendingUp"
          color="text-success"
          bgColor="bg-success-subtle"
        />
        <AnalyticsCard
          title="Success Rate"
          value={`${successRate}%`}
          trend={successRate >= 80 ? 'up' : 'down'}
          change={successRate >= 80 ? 3 : -2}
          iconName="BarChart3"
          color="text-primary"
          bgColor="bg-primary-subtle"
        />
        <AnalyticsCard
          title="Completed"
          value={completedDeliveries ?? 0}
          trend="up"
          change={15}
          iconName="Clock"
          color="text-warning"
          bgColor="bg-warning-subtle"
        />
      </div>

      {/* Revenue Chart - Full width */}
      <RevenueChart
        data={revenueData}
        totalRevenue={totalRevenue}
        totalPayouts={totalPayouts}
        period="Last 6 months"
      />

      {/* Funnel + Route Map side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DeliveryFunnel steps={funnelSteps} />
        <RouteMap
          topOrigins={topOrigins}
          topDestinations={topDestinations}
          totalActiveRoutes={activeRoutes.length}
        />
      </div>

      {/* User Growth */}
      <div className="rounded-2xl bg-surface p-6 shadow-[var(--shadow-bento)] border border-border-subtle">
        <div className="mb-4">
          <h2 className="text-base font-heading font-semibold text-foreground">User Growth</h2>
          <p className="text-xs text-muted mt-0.5">New signups over the last 12 weeks</p>
        </div>
        <DashboardChart data={growthData} />
      </div>

      {/* Top Travellers */}
      <div className="rounded-2xl bg-surface p-6 shadow-[var(--shadow-bento)] border border-border-subtle">
        <div className="flex items-center gap-2 mb-5">
          <div className="rounded-xl bg-warning-subtle p-2">
            <Star className="h-4 w-4 text-warning" />
          </div>
          <h2 className="text-base font-heading font-semibold text-foreground">Top Travellers</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {!topTravellers || topTravellers.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center col-span-full">No traveller data yet</p>
          ) : (
            topTravellers.map((t: any, i: number) => (
              <div key={t.id} className="flex flex-col items-center p-4 rounded-xl border border-border-subtle hover:shadow-sm transition-all text-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warning-subtle to-warning/10 flex items-center justify-center mb-2">
                  <span className="text-sm font-bold text-warning">{i + 1}</span>
                </div>
                <p className="text-sm font-medium text-foreground truncate w-full">{t.full_name || 'Unknown'}</p>
                <p className="text-xs text-muted">{t.total_deliveries ?? 0} deliveries</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Star className="h-3 w-3 text-warning fill-warning" />
                  <span className="text-xs font-semibold text-foreground">{(t.rating ?? 0).toFixed(1)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
