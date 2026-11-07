'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Compass,
  Home,
  MessageSquare,
  Package,
  PlusCircle,
  Search,
  User,
} from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationProvider'

interface TabItem {
  name: string
  href: string
  icon: typeof Home
  exact?: boolean
  badgeCount?: number
}

export function AppTabBar() {
  const pathname = usePathname()
  const notifCtx = useNotifications()
  const unreadCount = notifCtx?.unreadCount ?? 0

  const tabs: TabItem[] = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
      exact: true,
    },
    {
      name: 'Search',
      href: '/search',
      icon: Search,
    },
    {
      name: 'Activity',
      href: '/activity',
      icon: Package,
      badgeCount: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      name: 'Messages',
      href: '/chat',
      icon: MessageSquare,
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
    },
  ]

  const isActive = (tab: TabItem) => {
    if (tab.exact) return pathname === tab.href
    return pathname.startsWith(tab.href)
  }

  return (
    <nav
      aria-label="Mobile Application Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] pb-[env(safe-area-inset-bottom,8px)] transition-all"
    >
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto items-center px-1">
        {tabs.map((tab) => {
          const active = isActive(tab)
          const Icon = tab.icon

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center py-1 transition-all active:scale-90 ${
                active
                  ? 'text-[#004AAD] font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {/* Active pill background indicator */}
              {active && (
                <span className="absolute -top-1 w-8 h-1 rounded-full bg-[#004AAD]" />
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    active ? 'scale-110 text-[#004AAD]' : 'text-slate-500'
                  }`}
                  strokeWidth={active ? 2.5 : 2}
                />

                {/* Badge counter */}
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                    {tab.badgeCount > 9 ? '9+' : tab.badgeCount}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] mt-1 tracking-tight leading-none ${
                  active ? 'font-bold text-[#004AAD]' : 'font-medium text-slate-500'
                }`}
              >
                {tab.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

