import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import { Star } from 'lucide-react'
import AnalyticsCard from '@/components/AnalyticsCard'
import DashboardChart from '@/components/DashboardChart'
import RevenueChart from '@/components/RevenueChart'
import DeliveryFunnel from '@/components/DeliveryFunnel'
import RouteMap from '@/components/RouteMap'

const PLATFORM_COMMISSION_RATE = 0.18
const MAX_ANALYTICS_PAYMENTS = 2000
const MAX_ANALYTICS_ACTIVE_TRIPS = 1000
const MAX_ANALYTICS_RECENT_REQUESTS = 2000

export default async function AnalyticsPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect(auth.error === 'Authentication required' ? '/login' : '/unauthorized')
  const supabase = auth.supabase

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [
    totalUsersResult,
    completedDeliveriesResult,
    failedDeliveriesResult,
    paymentsResult,
    topTravellersResult,
    tripRoutesResult,
  ] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase
      .from('payments')
      .select('amount, created_at, status')
      .eq('status', 'released')
      .gte('created_at', sixMonthsAgo.toISOString())
      .limit(MAX_ANALYTICS_PAYMENTS),
    supabase.from('user_profiles').select('id, full_name, rating, total_deliveries').order('rating', { ascending: false }).limit(5),
    supabase
      .from('trips')
      .select('from_city, to_city, status')
      .eq('status', 'active')
      .limit(MAX_ANALYTICS_ACTIVE_TRIPS),
  ])

  const initialError = [totalUsersResult, completedDeliveriesResult, failedDeliveriesResult, paymentsResult, topTravellersResult, tripRoutesResult]
    .find((result) => result.error)?.error
  if (initialError) throw new Error(`Unable to load analytics: ${initialError.message}`)

  const totalUsers = totalUsersResult.count
  const completedDeliveries = completedDeliveriesResult.count
  const failedDeliveries = failedDeliveriesResult.count
  const payments = paymentsResult.data
  const topTravellers = topTravellersResult.data
  const tripRoutes = tripRoutesResult.data

  const totalDeliveries = (completedDeliveries ?? 0) + (failedDeliveries ?? 0)
  const successRate = totalDeliveries > 0
    ? Math.round(((completedDeliveries ?? 0) / totalDeliveries) * 100)
    : 0

  const releasedPayments = payments || []
  const totalRevenue = releasedPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
  const totalPayouts = Math.round(totalRevenue * (1 - PLATFORM_COMMISSION_RATE))

  // Build revenue chart data (last 6 months)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now = new Date()
  const revenueData = Array.from({ length: 6 }, (_, i) => {
    const monthIndex = (now.getMonth() - 5 + i + 12) % 12
    const monthPayments = releasedPayments.filter((p: { created_at: string }) => {
      const d = new Date(p.created_at)
      return d.getMonth() === monthIndex
    })
    const monthRevenue = monthPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
    return {
      name: months[monthIndex],
      revenue: monthRevenue,
      payouts: Math.round(monthRevenue * (1 - PLATFORM_COMMISSION_RATE)),
    }
  })

  // User growth data
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)

  const { data: recentUsers, error: recentUsersError } = await supabase
    .from('user_profiles')
    .select('created_at')
    .gte('created_at', twelveWeeksAgo.toISOString())

  if (recentUsersError) throw new Error(`Unable to load user growth: ${recentUsersError.message}`)

  const weeklyGrowth: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const weekLabel = `W${12 - i}`
    weeklyGrowth[weekLabel] = 0
  }

  recentUsers?.forEach((u: { created_at: string }) => {
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
  const activeRoutes = tripRoutes || []

  // Build origin/destination data for RouteMap
  const originCounts: Record<string, number> = {}
  const destCounts: Record<string, number> = {}
  activeRoutes.forEach((t: { from_city: string; to_city: string }) => {
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

  // Delivery funnel from recent requests (last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const { data: recentRequests, error: recentRequestsError } = await supabase
    .from('requests')
    .select('status')
    .gte('created_at', ninetyDaysAgo.toISOString())
    .limit(MAX_ANALYTICS_RECENT_REQUESTS)

  if (recentRequestsError) throw new Error(`Unable to load delivery funnel: ${recentRequestsError.message}`)

  const requestStatuses = recentRequests || []
  const funnelSteps = [
    { label: 'Total Requests', count: requestStatuses.length, color: 'bg-gradient-to-r from-primary to-primary/70' },
    { label: 'Matched', count: requestStatuses.filter((r: { status: string }) => ['accepted', 'in_transit', 'completed', 'failed'].includes(r.status)).length, color: 'bg-gradient-to-r from-accent to-accent/70' },
    { label: 'In Transit', count: requestStatuses.filter((r: { status: string }) => ['in_transit', 'completed'].includes(r.status)).length, color: 'bg-gradient-to-r from-warning to-warning/70' },
    { label: 'Delivered', count: requestStatuses.filter((r: { status: string }) => r.status === 'completed').length, color: 'bg-gradient-to-r from-success to-success/70' },
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
          iconName="Users"
          color="text-primary"
          bgColor="bg-primary-subtle"
        />
        <AnalyticsCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          iconName="TrendingUp"
          color="text-success"
          bgColor="bg-success-subtle"
        />
        <AnalyticsCard
          title="Success Rate"
          value={`${successRate}%`}
          iconName="BarChart3"
          color="text-primary"
          bgColor="bg-primary-subtle"
        />
        <AnalyticsCard
          title="Completed"
          value={completedDeliveries ?? 0}
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
            topTravellers.map((t: { id: string; full_name: string | null; rating: number | null; total_deliveries: number | null }, i: number) => (
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
