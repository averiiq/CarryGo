'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useOptionalNotifications } from '@/contexts/NotificationProvider'

/**
 * Header bell icon with unread count badge. Routes to the full /notifications
 * inbox. Returns null when the provider isn't mounted or user isn't signed in.
 */
export function NotificationBell({ className }: { className?: string }) {
  const ctx = useOptionalNotifications()
  if (!ctx || !ctx.userId) return null

  const count = ctx.unreadCount
  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `${count} unread notifications` : 'Notifications'}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-200 transition ${className ?? ''}`}
    >
      <Bell className="w-4 h-4" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
