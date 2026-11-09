'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Navigation,
  Package,
  CreditCard,
  Users,
  FileCheck,
  BarChart3,
  AlertTriangle,
  HeadphonesIcon,
  Settings,
  ScrollText,
  Layers,
  Bell,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

type NavItem = { label: string; href: string; icon: LucideIcon }
type NavGroup = { heading: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Trips', href: '/dashboard/trips', icon: Navigation },
      { label: 'Parcels', href: '/dashboard/parcels', icon: Package },
      { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
      { label: 'Users', href: '/dashboard/users', icon: Users },
    ],
  },
  {
    heading: 'Verification',
    items: [
      { label: 'KYC', href: '/dashboard/kyc', icon: FileCheck },
      { label: 'Disputes', href: '/dashboard/disputes', icon: AlertTriangle },
      { label: 'Support', href: '/dashboard/support', icon: HeadphonesIcon },
    ],
  },
  {
    heading: 'Content',
    items: [
      { label: 'Bulk ops', href: '/dashboard/bulk', icon: Layers },
      { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
      { label: 'Banners', href: '/dashboard/banners', icon: Sparkles },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { label: 'Audit log', href: '/dashboard/audit', icon: ScrollText },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
]

// Flat export kept for Header's mobile nav + CommandPalette compatibility
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <motion.aside
      initial={false}
      className="fixed left-0 top-0 bottom-0 z-40 hidden w-[260px] flex-col border-r border-border-subtle bg-surface md:flex"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border-subtle">
        <img
          src="/logo-horizontal.png"
          alt="CaryGoo"
          className="h-8 w-auto object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={group.heading} className={groupIdx > 0 ? 'mt-5' : ''}>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
              {group.heading}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-200 group ${
                      isActive
                        ? 'text-primary font-semibold'
                        : 'text-muted font-medium hover:text-foreground hover:bg-surface-elevated'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg bg-primary-subtle"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon
                      className={`w-[18px] h-[18px] flex-shrink-0 relative z-10 ${
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    />
                    <span className="relative z-10 truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer brand stripe */}
      <div className="border-t border-border-subtle px-5 py-3">
        <p className="text-[10px] font-medium text-muted-foreground">
          CaryGoo Admin · v3.4
        </p>
      </div>
    </motion.aside>
  )
}
