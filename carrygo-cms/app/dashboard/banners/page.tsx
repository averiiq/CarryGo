import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import { Sparkles, Eye, CheckCircle2, Flame, Layers } from 'lucide-react'
import BannerManager, { type PromotionalBannerRow } from './BannerManager'

export default async function BannersPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect(auth.error === 'Authentication required' ? '/login' : '/unauthorized')
  const supabase = auth.supabase

  // Fetch all promotional banners ordered by display_order
  const { data: rows } = await supabase
    .from('promotional_banners')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  const banners: PromotionalBannerRow[] = (rows ?? []).map((r: any) => ({
    id: r.id,
    type: r.type || 'urgent',
    badge_text: r.badge_text || '',
    badge_color: r.badge_color || '#F59E0B',
    title: r.title || '',
    subtitle: r.subtitle || '',
    cta_text: r.cta_text || 'Learn More',
    cta_action: r.cta_action || 'create_parcel',
    deep_link: r.deep_link || null,
    image_url: r.image_url || null,
    display_order: Number(r.display_order ?? 0),
    is_active: Boolean(r.is_active),
    created_at: r.created_at,
  }))

  const totalCount = banners.length
  const activeCount = banners.filter((b) => b.is_active).length
  const urgentCount = banners.filter((b) => b.type === 'urgent').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">
          Promotional Banners
        </h1>
        <p className="text-sm text-muted mt-1">
          Manage dynamic promotional banners, express alerts, commission waivers, and marketing campaigns shown in the mobile app.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Configured Banners',
            value: String(totalCount),
            icon: Layers,
            color: 'text-primary',
            bg: 'bg-primary-subtle',
          },
          {
            label: 'Active in Mobile Feed',
            value: String(activeCount),
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
          },
          {
            label: 'Urgent Same-Day Campaigns',
            value: String(urgentCount),
            icon: Flame,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
          },
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

      {/* Interactive Manager */}
      <BannerManager initialBanners={banners} />
    </div>
  )
}
