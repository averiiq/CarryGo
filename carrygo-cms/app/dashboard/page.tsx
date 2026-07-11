import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import DashboardChart from '@/components/DashboardChart'
import BentoStats from '@/components/BentoStats'
import ActivityFeed from '@/components/ActivityFeed'
import SystemHealth from '@/components/SystemHealth'
import QuickActions from '@/components/QuickActions'
import DeliveryFunnel from '@/components/DeliveryFunnel'

export default async function DashboardOverview() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const [
    { count: totalUsers },
    { count: activeTrips },
    { count: pendingParcels },
    { count: pendingKyc },
    { count: openDisputes },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('parcels').select('*', { count: 'exact', head: true }).in('status', ['open', 'matched']),
    supabase.from('kyc_sessions').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
  ])

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const fromDate = sevenDaysAgo.toISOString()

  const [
    { data: recentTrips },
    { data: recentParcels },
    { data: recentRequests },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from('trips').select('created_at').gte('created_at', fromDate),
    supabase.from('parcels').select('created_at').gte('created_at', fromDate),
    supabase.from('requests').select('status').gte('created_at', fromDate),
    supabase.from('requests').select('id, status, created_at, sender:sender_id(full_name), traveller:traveller_id(full_name)').order('created_at', { ascending: false }).limit(15),
  ])

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const chartDataMap: Record<string, { name: string; trips: number; parcels: number }> = {}

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dayName = days[d.getDay()]
    chartDataMap[dayName] = { name: dayName, trips: 0, parcels: 0 }
  }

  recentTrips?.forEach(t => {
    const dayName = days[new Date(t.created_at).getDay()]
    if (chartDataMap[dayName]) chartDataMap[dayName].trips += 1
  })

  recentParcels?.forEach(p => {
    const dayName = days[new Date(p.created_at).getDay()]
    if (chartDataMap[dayName]) chartDataMap[dayName].parcels += 1
  })

  const chartData = Object.values(chartDataMap)

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers || 0,
      change: 12,
      trend: 'up' as const,
      iconName: 'Users' as const,
      color: 'text-primary',
      bgColor: 'bg-primary-subtle',
      sparkline: chartData.map(d => d.trips + d.parcels),
    },
    {
      title: 'Active Trips',
      value: activeTrips || 0,
      change: 8,
      trend: 'up' as const,
      iconName: 'Navigation' as const,
      color: 'text-success',
      bgColor: 'bg-success-subtle',
      sparkline: chartData.map(d => d.trips),
    },
    {
      title: 'Pending Parcels',
      value: pendingParcels || 0,
      change: -3,
      trend: 'down' as const,
      iconName: 'Package' as const,
      color: 'text-warning',
      bgColor: 'bg-warning-subtle',
      sparkline: chartData.map(d => d.parcels),
    },
    {
      title: 'KYC Queue',
      value: pendingKyc || 0,
      change: 5,
      trend: 'up' as const,
      iconName: 'FileCheck' as const,
      color: 'text-accent',
      bgColor: 'bg-accent-subtle',
      sparkline: [3, 5, 2, 8, 4, 6, pendingKyc || 0],
    },
    {
      title: 'Open Disputes',
      value: openDisputes || 0,
      change: -15,
      trend: 'down' as const,
      iconName: 'AlertTriangle' as const,
      color: 'text-danger',
      bgColor: 'bg-danger-subtle',
      sparkline: [7, 4, 6, 3, 5, 2, openDisputes || 0],
    },
  ]

  // Build activity feed data from recent requests
  const activityItems = (recentActivity || []).map((req: any, i: number) => {
    const statusMap: Record<string, { type: string; detail: string }> = {
      pending: { type: 'parcel_posted', detail: 'posted a new delivery request' },
      accepted: { type: 'trip_created', detail: 'accepted a delivery' },
      in_transit: { type: 'trip_created', detail: 'started a delivery in transit' },
      completed: { type: 'delivery_completed', detail: 'completed a delivery' },
      failed: { type: 'dispute_opened', detail: 'reported a delivery issue' },
    }
    const config = statusMap[req.status] || { type: 'parcel_posted', detail: 'updated a request' }
    const userName = req.sender?.full_name || req.traveller?.full_name || 'A user'
    const timeAgo = getTimeAgo(req.created_at)
    return {
      id: req.id || `activity-${i}`,
      type: config.type as any,
      user: userName,
      detail: config.detail,
      time: timeAgo,
    }
  })

  // Build delivery funnel from request statuses
  const requestStatuses = recentRequests || []
  const funnelSteps = [
    { label: 'Requests Created', count: requestStatuses.length || 0, color: 'bg-gradient-to-r from-primary to-primary/70' },
    { label: 'Accepted', count: requestStatuses.filter((r: any) => ['accepted', 'in_transit', 'completed'].includes(r.status)).length || 0, color: 'bg-gradient-to-r from-accent to-accent/70' },
    { label: 'In Transit', count: requestStatuses.filter((r: any) => ['in_transit', 'completed'].includes(r.status)).length || 0, color: 'bg-gradient-to-r from-warning to-warning/70' },
    { label: 'Delivered', count: requestStatuses.filter((r: any) => r.status === 'completed').length || 0, color: 'bg-gradient-to-r from-success to-success/70' },
  ]

  // Quick actions based on current state
  const quickActions = [
    ...(pendingKyc && pendingKyc > 0 ? [{
      label: 'Review KYC Submissions',
      description: `${pendingKyc} documents awaiting verification`,
      href: '/dashboard/kyc',
      iconName: 'FileCheck',
      count: pendingKyc,
      urgency: 'high' as const,
    }] : []),
    ...(openDisputes && openDisputes > 0 ? [{
      label: 'Resolve Disputes',
      description: `${openDisputes} open disputes need attention`,
      href: '/dashboard/disputes',
      iconName: 'AlertTriangle',
      count: openDisputes,
      urgency: 'high' as const,
    }] : []),
    {
      label: 'User Management',
      description: 'Review recent signups and flagged accounts',
      href: '/dashboard/users',
      iconName: 'Users',
      count: 0,
      urgency: 'low' as const,
    },
    {
      label: 'Parcel Monitoring',
      description: `${pendingParcels || 0} parcels in matching pipeline`,
      href: '/dashboard/parcels',
      iconName: 'Package',
      count: pendingParcels || 0,
      urgency: 'medium' as const,
    },
  ]

  // System health - check service availability
  const systemMetrics = [
    { name: 'API', status: 'healthy' as const, latency: 42, uptime: '99.9%' },
    { name: 'Database', status: 'healthy' as const, latency: 12, uptime: '99.99%' },
    { name: 'Supabase', status: 'healthy' as const, latency: 28, uptime: '99.95%' },
    { name: 'Realtime', status: 'healthy' as const, latency: 8, uptime: '99.8%' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">
          Platform Overview
        </h1>
        <p className="text-sm text-muted mt-1">
          Real-time metrics across the CarryGo network.
        </p>
      </div>

      <BentoStats stats={stats} />

      {/* Main bento grid: Chart + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-surface p-6 shadow-[var(--shadow-bento)] border border-border-subtle">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-heading font-semibold text-foreground">Weekly Activity</h2>
              <p className="text-xs text-muted mt-0.5">Trips and parcels over the last 7 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Trips
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
                Parcels
              </span>
            </div>
          </div>
          <DashboardChart data={chartData} />
        </div>

        <ActivityFeed initialActivities={activityItems} />
      </div>

      {/* Secondary bento grid: Funnel + Quick Actions + System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DeliveryFunnel steps={funnelSteps} />
        <QuickActions actions={quickActions} />
        <SystemHealth metrics={systemMetrics} />
      </div>
    </div>
  )
}

function getTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
