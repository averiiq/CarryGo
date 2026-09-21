import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import DashboardChart from '@/components/DashboardChart'
import BentoStats from '@/components/BentoStats'
import ActivityFeed from '@/components/ActivityFeed'
import SystemHealth from '@/components/SystemHealth'
import QuickActions from '@/components/QuickActions'
import DeliveryFunnel from '@/components/DeliveryFunnel'
import { isAwsCmsBackendEnabled } from '@/utils/backend/provider'
import { awsCmsRequest } from '@/utils/aws/api'

export default async function DashboardOverview() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect(auth.error === 'Authentication required' ? '/login' : '/unauthorized')
  const supabase = auth.supabase

  const awsMode = isAwsCmsBackendEnabled()

  let totalUsers = 0
  let activeTrips = 0
  let pendingParcels = 0
  let pendingKyc = 0
  let openDisputes = 0

  const [usersCountResult, kycCountResult] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('kyc_sessions').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
  ])

  if (usersCountResult.error || kycCountResult.error) {
    throw new Error('Unable to load dashboard totals')
  }

  totalUsers = usersCountResult.count ?? 0
  pendingKyc = kycCountResult.count ?? 0

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const fromDate = sevenDaysAgo.toISOString()

  let recentTrips: Array<{ created_at: string }> = []
  let recentParcels: Array<{ created_at: string }> = []
  let recentRequests: Array<{ status: string }> = []
  let recentActivity: Array<Record<string, unknown>> = []

  if (awsMode) {
    const [tripsResponse, parcelsResponse, disputesResponse] = await Promise.all([
      awsCmsRequest('/trips?limit=200&offset=0') as Promise<{ data: Array<{ createdAt: string }>; total?: number }>,
      awsCmsRequest('/parcels?limit=200&offset=0') as Promise<{ data: Array<{ createdAt: string }>; total?: number }>,
      awsCmsRequest('/admin/disputes?limit=50') as Promise<{
        data: {
          failedRequests: Array<{
            id: string
            status: string
            createdAt: string
            senderName?: string
            travellerName?: string
          }>
        }
      }>,
    ])

    activeTrips = tripsResponse.total ?? tripsResponse.data.length
    pendingParcels = parcelsResponse.total ?? parcelsResponse.data.length
    openDisputes = disputesResponse.data.failedRequests.length

    recentTrips = tripsResponse.data
      .filter((item) => item.createdAt >= fromDate)
      .map((item) => ({ created_at: item.createdAt }))

    recentParcels = parcelsResponse.data
      .filter((item) => item.createdAt >= fromDate)
      .map((item) => ({ created_at: item.createdAt }))

    recentRequests = disputesResponse.data.failedRequests.map((item) => ({ status: item.status }))
    recentActivity = disputesResponse.data.failedRequests.map((item) => ({
      id: item.id,
      status: item.status,
      created_at: item.createdAt,
      sender: { full_name: item.senderName ?? null },
      traveller: { full_name: item.travellerName ?? null },
    }))
  } else {
    const [tripsResult, parcelsResult, requestsResult, activityResult, countsResult] = await Promise.all([
      supabase.from('trips').select('created_at').gte('created_at', fromDate),
      supabase.from('parcels').select('created_at').gte('created_at', fromDate),
      supabase.from('requests').select('status').gte('created_at', fromDate),
      supabase
        .from('requests')
        .select('id, status, created_at, sender:sender_id(full_name), traveller:traveller_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(15),
      Promise.all([
        supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('parcels').select('*', { count: 'exact', head: true }).in('status', ['open', 'matched']),
        supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      ]),
    ])

    const queryError = [tripsResult, parcelsResult, requestsResult, activityResult, ...countsResult]
      .find((result) => result.error)?.error
    if (queryError) throw new Error(`Unable to load dashboard data: ${queryError.message}`)

    recentTrips = tripsResult.data ?? []
    recentParcels = parcelsResult.data ?? []
    recentRequests = requestsResult.data ?? []
    recentActivity = activityResult.data ?? []

    activeTrips = countsResult[0].count ?? 0
    pendingParcels = countsResult[1].count ?? 0
    openDisputes = countsResult[2].count ?? 0
  }

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
      iconName: 'Users' as const,
      color: 'text-primary',
      bgColor: 'bg-primary-subtle',
      sparkline: chartData.map(d => d.trips + d.parcels),
    },
    {
      title: 'Active Trips',
      value: activeTrips || 0,
      iconName: 'Navigation' as const,
      color: 'text-success',
      bgColor: 'bg-success-subtle',
      sparkline: chartData.map(d => d.trips),
    },
    {
      title: 'Pending Parcels',
      value: pendingParcels || 0,
      iconName: 'Package' as const,
      color: 'text-warning',
      bgColor: 'bg-warning-subtle',
      sparkline: chartData.map(d => d.parcels),
    },
    {
      title: 'KYC Queue',
      value: pendingKyc || 0,
      iconName: 'FileCheck' as const,
      color: 'text-accent',
      bgColor: 'bg-accent-subtle',
    },
    {
      title: 'Open Disputes',
      value: openDisputes || 0,
      iconName: 'AlertTriangle' as const,
      color: 'text-danger',
      bgColor: 'bg-danger-subtle',
    },
  ]

  type ActivityType = 'trip_created' | 'parcel_posted' | 'delivery_completed' | 'kyc_submitted' | 'dispute_opened' | 'payment_released'
  const activityItems = (recentActivity || []).map((req: Record<string, unknown>, i: number) => {
    const status = req.status as string
    const statusMap: Record<string, { type: ActivityType; detail: string }> = {
      pending: { type: 'parcel_posted', detail: 'posted a new delivery request' },
      accepted: { type: 'trip_created', detail: 'accepted a delivery' },
      in_transit: { type: 'trip_created', detail: 'started a delivery in transit' },
      completed: { type: 'delivery_completed', detail: 'completed a delivery' },
      failed: { type: 'dispute_opened', detail: 'reported a delivery issue' },
    }
    const statusConfig = statusMap[status] || { type: 'parcel_posted' as ActivityType, detail: 'updated a request' }
    const sender = req.sender as { full_name: string | null } | null
    const traveller = req.traveller as { full_name: string | null } | null
    const userName = sender?.full_name || traveller?.full_name || 'A user'
    const timeAgo = getTimeAgo(req.created_at as string)
    return {
      id: (req.id as string) || `activity-${i}`,
      type: statusConfig.type,
      user: userName,
      detail: statusConfig.detail,
      time: timeAgo,
    }
  })

  const requestStatuses = recentRequests || []
  const funnelSteps = [
    { label: 'Requests Created', count: requestStatuses.length || 0, color: 'bg-gradient-to-r from-primary to-primary/70' },
    { label: 'Accepted', count: requestStatuses.filter((r: { status: string }) => ['accepted', 'in_transit', 'completed'].includes(r.status)).length || 0, color: 'bg-gradient-to-r from-accent to-accent/70' },
    { label: 'In Transit', count: requestStatuses.filter((r: { status: string }) => ['in_transit', 'completed'].includes(r.status)).length || 0, color: 'bg-gradient-to-r from-warning to-warning/70' },
    { label: 'Delivered', count: requestStatuses.filter((r: { status: string }) => r.status === 'completed').length || 0, color: 'bg-gradient-to-r from-success to-success/70' },
  ]

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

  let awsApiStatus: 'healthy' | 'degraded' | 'down' | null = null
  if (isAwsCmsBackendEnabled()) {
    try {
      await awsCmsRequest<{ status?: string }>('/health')
      awsApiStatus = 'healthy'
    } catch {
      awsApiStatus = 'down'
    }
  }

  const systemMetrics = [
    { name: 'Database', status: 'healthy' as const },
    ...(awsApiStatus
      ? [{ name: 'AWS API', status: awsApiStatus }]
      : []),
  ]

  return (
    <div className="space-y-6">
      <BentoStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-heading font-semibold text-foreground">Weekly Activity</h2>
              <p className="text-[11px] text-muted mt-0.5">Trips and parcels over the last 7 days</p>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Trips
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" />
                Parcels
              </span>
            </div>
          </div>
          <DashboardChart data={chartData} />
        </div>

        <ActivityFeed initialActivities={activityItems} />
      </div>

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
