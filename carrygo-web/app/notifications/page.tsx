'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  CreditCard,
  MessageCircle,
  Package,
  RefreshCcw,
  Star,
  Truck,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { useNotifications } from '@/contexts/NotificationProvider'
import {
  formatRelativeTime,
  getDeepLinkRoute,
  type AppNotification,
} from '@/services/notifications.service'

type Tab = 'all' | 'deliveries' | 'messages' | 'payments' | 'matches'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'deliveries', label: 'Deliveries' },
  { id: 'messages', label: 'Messages' },
  { id: 'payments', label: 'Payments' },
  { id: 'matches', label: 'Matches' },
]

function iconFor(type: string) {
  if (type === 'chat_message' || type === 'message')
    return { Icon: MessageCircle, color: 'text-amber-700', bg: 'bg-amber-100' }
  if (type.includes('delivery_otp') || type.includes('otp'))
    return { Icon: Bell, color: 'text-emerald-700', bg: 'bg-emerald-100' }
  if (type.includes('delivery') || type.includes('request'))
    return { Icon: Truck, color: 'text-blue-700', bg: 'bg-blue-100' }
  if (type.includes('payment'))
    return { Icon: CreditCard, color: 'text-violet-700', bg: 'bg-violet-100' }
  if (type.includes('match'))
    return { Icon: Package, color: 'text-indigo-700', bg: 'bg-indigo-100' }
  if (type.includes('rating'))
    return { Icon: Star, color: 'text-amber-700', bg: 'bg-amber-100' }
  return { Icon: Bell, color: 'text-emerald-700', bg: 'bg-emerald-100' }
}

function matchesTab(n: AppNotification, tab: Tab): boolean {
  if (tab === 'all') return true
  const t = n.type ?? ''
  if (tab === 'deliveries')
    return (
      t.includes('delivery') ||
      t.includes('request') ||
      t.includes('otp') ||
      n.category === 'parcel_update' ||
      n.category === 'trip_update'
    )
  if (tab === 'messages') return t === 'chat_message' || n.category === 'message'
  if (tab === 'payments') return t.includes('payment') || n.category === 'payment'
  if (tab === 'matches') return t.includes('match') || n.category === 'matching'
  return true
}

export default function NotificationsPage() {
  const router = useRouter()
  const { userId, notifications, unreadCount, loading, refresh, markOneRead, markAllRead } =
    useNotifications()
  const [tab, setTab] = useState<Tab>('all')

  const filtered = useMemo(
    () => notifications.filter((n) => matchesTab(n, tab)),
    [notifications, tab],
  )

  if (!userId) {
    return (
      <MarketingShell>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-heading font-extrabold text-slate-900">
            Sign in to view notifications
          </h1>
          <Link
            href="/login?next=%2Fnotifications"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
          >
            Sign in
          </Link>
        </div>
      </MarketingShell>
    )
  }

  const handleOpen = async (n: AppNotification) => {
    if (!n.read) await markOneRead(n.id)
    const route = getDeepLinkRoute(n.type, n.relatedId, n.deepLink)
    if (route) router.push(route)
  }

  return (
    <MarketingShell>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/activity"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Refresh"
              disabled={loading}
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-5">
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-600 text-white">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                  active
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {loading && notifications.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">You're all caught up</h2>
            <p className="text-xs text-slate-500">
              {tab === 'all'
                ? "No notifications yet. We'll notify you when something happens."
                : `No ${tab} notifications to display.`}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((n) => {
              const { Icon, color, bg } = iconFor(n.type ?? '')
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleOpen(n)}
                    className={`w-full text-left flex items-start gap-3 p-3.5 rounded-2xl border transition ${
                      n.read
                        ? 'bg-white border-slate-200 hover:bg-slate-50'
                        : 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{n.title}</p>
                        <span className="shrink-0 text-[11px] text-slate-500">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{n.body}</p>
                    </div>
                    {!n.read && (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-600 mt-1.5" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </MarketingShell>
  )
}
