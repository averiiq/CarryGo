import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import { Bell, Megaphone, Users, TrendingUp } from 'lucide-react'
import BroadcastComposer from './BroadcastComposer'

export default async function NotificationsPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect(auth.error === 'Authentication required' ? '/login' : '/unauthorized')
  const supabase = auth.supabase

  // Fetch broadcast history
  const { data: broadcasts } = await supabase
    .from('admin_broadcasts')
    .select('id, title, body, category, priority, target_audience, total_targeted, total_sent, sent_at, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch distinct cities for audience selector
  const { data: cityRows } = await supabase
    .from('user_profiles')
    .select('city')
    .not('city', 'is', null)
    .eq('is_deleted', false)
  const cities = [...new Set((cityRows ?? []).map((r) => r.city).filter(Boolean))].sort() as string[]

  // Stats
  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)

  const { count: totalBroadcasts } = await supabase
    .from('admin_broadcasts')
    .select('*', { count: 'exact', head: true })

  const totalSentAll = (broadcasts ?? []).reduce((sum, b) => sum + (b.total_sent ?? 0), 0)

  const CATEGORY_LABELS: Record<string, string> = {
    broadcast: 'Announcement',
    promotion: 'Promotion',
    system_alert: 'System Alert',
  }
  const PRIORITY_COLORS: Record<string, string> = {
    low: 'text-muted bg-surface-elevated',
    normal: 'text-foreground bg-surface-elevated',
    high: 'text-amber-500 bg-amber-500/10',
    critical: 'text-red-500 bg-red-500/10',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Notifications & Broadcasts</h1>
        <p className="text-sm text-muted mt-1">Send announcements, promotions, and system alerts to all or targeted users.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: String(totalUsers ?? 0), icon: Users, color: 'text-primary', bg: 'bg-primary-subtle' },
          { label: 'Broadcasts Sent', value: String(totalBroadcasts ?? 0), icon: Megaphone, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Notifications Delivered', value: totalSentAll.toLocaleString(), icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-5 border border-border-subtle">
            <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-[18px] h-[18px] ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_400px] gap-6 items-start">
        {/* Broadcast History */}
        <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
          <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">Broadcast History</h2>
          </div>
          {!broadcasts || broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3">
                <Bell className="w-5 h-5 text-muted" />
              </div>
              <p className="text-sm text-muted">No broadcasts sent yet.</p>
              <p className="text-xs text-muted/70 mt-1">Use the composer on the right to send your first broadcast.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {broadcasts.map((b) => (
                <div key={b.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">{b.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[b.priority] ?? PRIORITY_COLORS.normal}`}>
                          {b.priority}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated text-muted">
                          {CATEGORY_LABELS[b.category] ?? b.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1 line-clamp-2">{b.body}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-foreground">{b.total_sent}</div>
                      <div className="text-xs text-muted">of {b.total_targeted} sent</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="text-xs text-muted">
                      {b.sent_at ? new Date(b.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                    {b.target_audience && (
                      <div className="text-xs text-muted">
                        → {(b.target_audience as { type: string; role?: string; city?: string }).type === 'all'
                          ? 'Everyone'
                          : (b.target_audience as { type: string; role?: string; city?: string }).type === 'role'
                          ? `Role: ${(b.target_audience as { type: string; role?: string }).role}`
                          : `City: ${(b.target_audience as { type: string; city?: string }).city}`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="glass rounded-2xl border border-border-subtle p-6">
          <div className="flex items-center gap-2 mb-6">
            <Megaphone className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">Compose Broadcast</h2>
          </div>
          <BroadcastComposer cities={cities} />
        </div>
      </div>
    </div>
  )
}
