'use client'

import { useRouter } from 'next/navigation'
import { Bell, X } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationProvider'
import { getDeepLinkRoute } from '@/services/notifications.service'

/**
 * Floating, auto-dismissing in-app banner shown when a new notification
 * arrives via the realtime subscription in <NotificationProvider>.
 * Mirrors the mobile `InAppNotificationBanner`.
 */
export function NotificationRealtimeBanner() {
  const { banner, dismissBanner } = useNotifications()
  const router = useRouter()

  if (!banner) return null

  const handleClick = () => {
    const route = getDeepLinkRoute(banner.type ?? '', banner.relatedId, banner.deepLink)
    dismissBanner()
    if (route) router.push(route)
  }

  return (
    <div className="fixed top-3 inset-x-0 z-[100] pointer-events-none flex justify-center px-3">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto w-full max-w-md animate-in slide-in-from-top-5 fade-in duration-300"
      >
        <button
          type="button"
          onClick={handleClick}
          className="w-full text-left flex items-start gap-3 rounded-2xl bg-white/95 backdrop-blur-md border border-emerald-200 shadow-xl shadow-emerald-900/10 px-3.5 py-3 hover:bg-white transition group"
        >
          <span className="shrink-0 w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{banner.title}</p>
            <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{banner.body}</p>
          </div>
          <span
            role="button"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation()
              dismissBanner()
            }}
            className="shrink-0 w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>
    </div>
  )
}
