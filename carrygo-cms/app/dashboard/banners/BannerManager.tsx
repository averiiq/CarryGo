'use client'

import { useState, useTransition } from 'react'
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react'
import {
  createPromotionalBanner,
  updatePromotionalBanner,
  togglePromotionalBannerActive,
  deletePromotionalBanner,
  reorderPromotionalBanners,
  type BannerInput,
} from './actions'

export interface PromotionalBannerRow {
  id: string
  type: string
  badge_text: string
  badge_color: string
  title: string
  subtitle: string
  cta_text: string
  cta_action: string
  deep_link?: string | null
  image_url?: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

const TYPE_OPTIONS = [
  { value: 'urgent', label: '⚡ Urgent Same-Day Express' },
  { value: 'corridor', label: '🛣️ Haryana Corridor Special' },
  { value: 'kyc', label: '⭐ KYC Trust & Verification' },
  { value: 'announcement', label: '📢 Announcement & News' },
  { value: 'discount', label: '🎁 Promo & Discount' },
]

const ACTION_OPTIONS = [
  { value: 'create_parcel', label: 'Open "Send Parcel" flow' },
  { value: 'create_trip', label: 'Open "Create Trip" flow' },
  { value: 'open_kyc', label: 'Open "KYC Verification" flow' },
  { value: 'matching', label: 'Open Instant Matching' },
  { value: 'link', label: 'Custom App Route / URL' },
  { value: 'none', label: 'No Action (Display only)' },
]

const COLOR_PRESETS = [
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Sky', hex: '#38BDF8' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Orange', hex: '#EA580C' },
]

const IMAGE_PRESETS = [
  { label: 'Bundled: Urgent Express', value: 'urgentExpress' },
  { label: 'Bundled: Haryana Road', value: 'haryanaRoad' },
  { label: 'Bundled: Verified KYC', value: 'verifiedKyc' },
]

export default function BannerManager({ initialBanners }: { initialBanners: PromotionalBannerRow[] }) {
  const [banners, setBanners] = useState<PromotionalBannerRow[]>(initialBanners)
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState<PromotionalBannerRow | null>(null)
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [badgeText, setBadgeText] = useState('⚡ SAME-DAY EXPRESS')
  const [badgeColor, setBadgeColor] = useState('#F59E0B')
  const [type, setType] = useState<BannerInput['type']>('urgent')
  const [ctaText, setCtaText] = useState('Send Parcel')
  const [ctaAction, setCtaAction] = useState<BannerInput['cta_action']>('create_parcel')
  const [imageUrl, setImageUrl] = useState('urgentExpress')
  const [customImageUrl, setCustomImageUrl] = useState('')
  const [deepLink, setDeepLink] = useState('')
  const [isActive, setIsActive] = useState(true)

  const openCreateModal = () => {
    setEditingBanner(null)
    setTitle('')
    setSubtitle('')
    setBadgeText('⚡ SAME-DAY EXPRESS')
    setBadgeColor('#F59E0B')
    setType('urgent')
    setCtaText('Send Parcel')
    setCtaAction('create_parcel')
    setImageUrl('urgentExpress')
    setCustomImageUrl('')
    setDeepLink('')
    setIsActive(true)
    setResult(null)
    setShowModal(true)
  }

  const openEditModal = (b: PromotionalBannerRow) => {
    setEditingBanner(b)
    setTitle(b.title)
    setSubtitle(b.subtitle)
    setBadgeText(b.badge_text)
    setBadgeColor(b.badge_color || '#F59E0B')
    setType((b.type as BannerInput['type']) || 'urgent')
    setCtaText(b.cta_text || 'Learn More')
    setCtaAction((b.cta_action as BannerInput['cta_action']) || 'create_parcel')

    if (b.image_url === 'urgentExpress' || b.image_url === 'haryanaRoad' || b.image_url === 'verifiedKyc') {
      setImageUrl(b.image_url)
      setCustomImageUrl('')
    } else {
      setImageUrl('custom')
      setCustomImageUrl(b.image_url || '')
    }

    setDeepLink(b.deep_link || '')
    setIsActive(b.is_active)
    setResult(null)
    setShowModal(true)
  }

  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, is_active: !current } : b)))
      const res = await togglePromotionalBannerActive(id, !current)
      if (res.error) {
        setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, is_active: current } : b)))
        setResult({ error: res.error })
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this promotional banner?')) return
    startTransition(async () => {
      setBanners((prev) => prev.filter((b) => b.id !== id))
      const res = await deletePromotionalBanner(id)
      if (res.error) {
        setResult({ error: res.error })
      }
    })
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= banners.length) return

    const newBanners = [...banners]
    const temp = newBanners[index]
    newBanners[index] = newBanners[targetIndex]
    newBanners[targetIndex] = temp

    const updated = newBanners.map((b, i) => ({ ...b, display_order: i }))
    setBanners(updated)

    startTransition(async () => {
      await reorderPromotionalBanners(updated.map((b) => b.id))
    })
  }

  const handleSave = () => {
    setResult(null)
    startTransition(async () => {
      const finalImageUrl = imageUrl === 'custom' ? customImageUrl.trim() : imageUrl

      const input: BannerInput = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        badge_text: badgeText.trim(),
        badge_color: badgeColor.trim(),
        type,
        cta_text: ctaText.trim(),
        cta_action: ctaAction,
        image_url: finalImageUrl || null,
        deep_link: deepLink.trim() || null,
        is_active: isActive,
      }

      if (editingBanner) {
        const res = await updatePromotionalBanner(editingBanner.id, input)
        if (res.error) {
          setResult({ error: res.error })
          return
        }
        if (res.data) {
          setBanners((prev) => prev.map((b) => (b.id === editingBanner.id ? { ...b, ...res.data } : b)))
          setShowModal(false)
        }
      } else {
        const res = await createPromotionalBanner(input)
        if (res.error) {
          setResult({ error: res.error })
          return
        }
        if (res.data) {
          setBanners((prev) => [...prev, res.data as unknown as PromotionalBannerRow])
          setShowModal(false)
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-semibold text-foreground">Active Banner Queue</h2>
          <p className="text-xs text-muted">Banners display on the mobile app home feed above the live marketplace in real time.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-hover shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Banner</span>
        </button>
      </div>

      {result?.error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{result.error}</span>
        </div>
      )}

      {/* Banners List */}
      {banners.length === 0 ? (
        <div className="glass rounded-2xl border border-border-subtle p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-5 h-5 text-muted" />
          </div>
          <p className="text-sm font-semibold text-foreground">No banners configured</p>
          <p className="text-xs text-muted mt-1">Click &quot;Create Banner&quot; to configure your first mobile promotional banner.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((b, idx) => (
            <div
              key={b.id}
              className={`glass rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                b.is_active ? 'border-border-subtle shadow-sm' : 'border-border-subtle/50 opacity-60'
              }`}
            >
              {/* Card Top: Live Mobile Preview Card */}
              <div className="p-4">
                <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-slate-900 border border-white/10 p-4 flex flex-col justify-between shadow-inner">
                  {/* Background overlay simulation */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/30 z-10" />

                  {/* Top: Badge & Status */}
                  <div className="relative z-20 flex items-center justify-between">
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase text-white shadow-sm"
                      style={{ backgroundColor: b.badge_color || '#F59E0B' }}
                    >
                      {b.badge_text}
                    </span>
                    <span className="text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Bottom: Title, Subtitle, CTA */}
                  <div className="relative z-20 space-y-1">
                    <h4 className="text-white font-bold text-sm leading-tight drop-shadow-sm">{b.title}</h4>
                    <p className="text-white/80 text-[11px] line-clamp-2 leading-relaxed">{b.subtitle}</p>
                    <div className="pt-2">
                      <span className="inline-block px-3 py-1 rounded-lg bg-primary text-white text-[11px] font-semibold shadow-sm">
                        {b.cta_text || 'Learn More'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Controls */}
              <div className="px-4 pb-4 pt-1 border-t border-border-subtle bg-surface-elevated/40 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Action: <strong className="text-foreground">{b.cta_action}</strong></span>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className={`text-[11px] font-medium ${b.is_active ? 'text-primary' : 'text-muted'}`}>
                      {b.is_active ? 'Active' : 'Draft'}
                    </span>
                    <input
                      type="checkbox"
                      checked={b.is_active}
                      onChange={() => handleToggle(b.id, b.is_active)}
                      disabled={isPending}
                      className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0 || isPending}
                      title="Move Up"
                      className="p-1.5 rounded-lg border border-border-subtle hover:bg-surface-elevated text-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === banners.length - 1 || isPending}
                      title="Move Down"
                      className="p-1.5 rounded-lg border border-border-subtle hover:bg-surface-elevated text-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(b)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border-subtle text-xs font-medium text-foreground hover:bg-surface-elevated transition-colors"
                    >
                      <Edit2 className="w-3 h-3 text-muted" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-strong border border-border-subtle rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold text-lg text-foreground">
                  {editingBanner ? 'Edit Promotional Banner' : 'Create Promotional Banner'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Preview Inside Modal */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Mobile App Live Card Preview</label>
              <div className="relative rounded-xl overflow-hidden aspect-[16/8] bg-slate-900 border border-white/10 p-4 flex flex-col justify-between shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/30 z-10" />
                <div className="relative z-20 flex items-center justify-between">
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase text-white shadow-sm"
                    style={{ backgroundColor: badgeColor || '#F59E0B' }}
                  >
                    {badgeText || '⚡ PREVIEW BADGE'}
                  </span>
                </div>
                <div className="relative z-20 space-y-1">
                  <h4 className="text-white font-bold text-sm drop-shadow-sm">{title || 'Banner Title Preview'}</h4>
                  <p className="text-white/80 text-[11px] line-clamp-2 leading-relaxed">
                    {subtitle || 'Banner subtitle preview showing benefits, discount, or urgency.'}
                  </p>
                  <div className="pt-1.5">
                    <span className="inline-block px-3 py-1 rounded-lg bg-primary text-white text-[11px] font-semibold shadow-sm">
                      {ctaText || 'Action'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Banner Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Urgent Same-Day Delivery"
                  className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Subtitle / Description *</label>
                <textarea
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  rows={2}
                  placeholder="e.g. Send or carry urgent documents & essentials with travellers leaving today."
                  className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Badge Text *</label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="e.g. ⚡ SAME-DAY EXPRESS"
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Badge Color</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setBadgeColor(c.hex)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          badgeColor === c.hex ? 'border-white scale-110 shadow-sm' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Category Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as BannerInput['type'])}
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">CTA Action</label>
                  <select
                    value={ctaAction}
                    onChange={(e) => setCtaAction(e.target.value as BannerInput['cta_action'])}
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                  >
                    {ACTION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Button Text</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g. Send Parcel"
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Deep Link (Optional)</label>
                  <input
                    type="text"
                    value={deepLink}
                    onChange={(e) => setDeepLink(e.target.value)}
                    placeholder="e.g. /create-parcel"
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Background Image Asset</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {IMAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setImageUrl(preset.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-colors ${
                        imageUrl === preset.value
                          ? 'border-primary bg-primary-subtle text-primary'
                          : 'border-border-subtle bg-surface-elevated text-muted hover:text-foreground'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setImageUrl('custom')}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-colors ${
                      imageUrl === 'custom'
                        ? 'border-primary bg-primary-subtle text-primary'
                        : 'border-border-subtle bg-surface-elevated text-muted hover:text-foreground'
                    }`}
                  >
                    Custom CDN Image URL
                  </button>
                </div>
                {imageUrl === 'custom' && (
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <label htmlFor="activeToggle" className="text-xs font-medium text-foreground cursor-pointer">
                  Publish & Activate banner immediately in mobile feed
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-border-subtle text-sm text-foreground hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || !title.trim() || !subtitle.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>{editingBanner ? 'Save Changes' : 'Create Banner'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
