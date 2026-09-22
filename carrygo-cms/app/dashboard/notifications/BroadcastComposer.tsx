'use client'

import { useState, useTransition } from 'react'
import { Bell, Send, Users, MapPin, Megaphone, ChevronDown, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { sendAdminBroadcast, type BroadcastAudience, type SendBroadcastInput } from './actions'

const CATEGORY_OPTIONS = [
  { value: 'broadcast', label: 'Announcement', icon: '📢' },
  { value: 'promotion', label: 'Promotion / Offer', icon: '🎁' },
  { value: 'system_alert', label: 'System Alert', icon: '⚠️' },
] as const

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-muted' },
  { value: 'normal', label: 'Normal', color: 'text-foreground' },
  { value: 'high', label: 'High', color: 'text-warning' },
  { value: 'critical', label: 'Critical', color: 'text-red-500' },
] as const

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone', icon: Users },
  { value: 'role_sender', label: 'All Senders', icon: Send },
  { value: 'role_traveller', label: 'All Travellers', icon: MapPin },
  { value: 'city', label: 'Specific City', icon: MapPin },
] as const

type AudienceOption = typeof AUDIENCE_OPTIONS[number]['value']

interface BroadcastComposerProps {
  cities: string[]
  onSuccess?: (broadcastId: string, totalSent: number) => void
}

export default function BroadcastComposer({ cities, onSuccess }: BroadcastComposerProps) {
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<SendBroadcastInput['category']>('broadcast')
  const [priority, setPriority] = useState<SendBroadcastInput['priority']>('normal')
  const [deepLink, setDeepLink] = useState('')
  const [audienceType, setAudienceType] = useState<AudienceOption>('all')
  const [selectedCity, setSelectedCity] = useState('')
  const [result, setResult] = useState<{ success?: true; error?: string; totalSent?: number } | null>(null)

  const buildAudience = (): BroadcastAudience => {
    if (audienceType === 'role_sender') return { type: 'role', role: 'sender' }
    if (audienceType === 'role_traveller') return { type: 'role', role: 'traveller' }
    if (audienceType === 'city') return { type: 'city', city: selectedCity }
    return { type: 'all' }
  }

  const handleSend = () => {
    setResult(null)
    startTransition(async () => {
      const res = await sendAdminBroadcast({
        title: title.trim(),
        body: body.trim(),
        category,
        priority,
        deepLink: deepLink.trim() || undefined,
        audience: buildAudience(),
      })
      if ('success' in res && res.success) {
        setResult({ success: true, totalSent: res.totalSent })
        onSuccess?.(res.broadcastId, res.totalSent)
        // reset form
        setTitle(''); setBody(''); setDeepLink('')
      } else {
        setResult({ error: res.error })
      }
    })
  }

  const isValid = title.trim().length >= 3 && body.trim().length >= 5 && (audienceType !== 'city' || selectedCity)

  return (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <label className="text-sm font-semibold text-foreground mb-2 block">Category</label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCategory(opt.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                category === opt.value
                  ? 'bg-primary-subtle border-primary/30 text-primary'
                  : 'border-border-subtle text-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              <span>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-sm font-semibold text-foreground mb-2 block">Title <span className="text-muted font-normal">({title.length}/100)</span></label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 100))}
          placeholder="e.g. Service Downtime Notice"
          className="w-full px-4 py-3 rounded-xl border border-border-subtle bg-surface text-foreground text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
        />
      </div>

      {/* Body */}
      <div>
        <label className="text-sm font-semibold text-foreground mb-2 block">Message <span className="text-muted font-normal">({body.length}/500)</span></label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 500))}
          rows={4}
          placeholder="Write your announcement here…"
          className="w-full px-4 py-3 rounded-xl border border-border-subtle bg-surface text-foreground text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 resize-none"
        />
      </div>

      {/* Deep Link */}
      <div>
        <label className="text-sm font-semibold text-foreground mb-2 block">Deep Link <span className="text-muted font-normal">(optional)</span></label>
        <input
          value={deepLink}
          onChange={(e) => setDeepLink(e.target.value)}
          placeholder="e.g. /(tabs)/requests or /subscriptions"
          className="w-full px-4 py-3 rounded-xl border border-border-subtle bg-surface text-foreground text-sm font-mono placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
        />
      </div>

      {/* Priority + Audience row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Priority</label>
          <div className="relative">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              className="w-full appearance-none px-4 py-3 rounded-xl border border-border-subtle bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Audience</label>
          <div className="relative">
            <select
              value={audienceType}
              onChange={(e) => { setAudienceType(e.target.value as AudienceOption); setSelectedCity('') }}
              className="w-full appearance-none px-4 py-3 rounded-xl border border-border-subtle bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {AUDIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* City selector */}
      {audienceType === 'city' && (
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Select City</label>
          <div className="relative">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full appearance-none px-4 py-3 rounded-xl border border-border-subtle bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">-- Select a city --</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          </div>
        </div>
      )}

      {/* Preview card */}
      {title && body && (
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Preview</label>
          <div className="p-4 rounded-xl border border-border-subtle bg-surface-elevated flex gap-3 items-start">
            <div className="w-10 h-10 rounded-xl bg-primary-subtle flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">{title}</div>
              <div className="text-xs text-muted mt-0.5 leading-relaxed">{body}</div>
              <div className="text-xs text-muted mt-1 opacity-60">Just now</div>
            </div>
          </div>
        </div>
      )}

      {/* Result banner */}
      {result?.success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Broadcast sent to <strong>{result.totalSent}</strong> users successfully!</span>
        </div>
      )}
      {result?.error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{result.error}</span>
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={isPending || !isValid}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm transition-all hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
        {isPending ? 'Sending…' : 'Send Broadcast'}
      </button>
    </div>
  )
}
