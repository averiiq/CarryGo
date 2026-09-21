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
} from 'lucide-react'

export const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Trips', href: '/dashboard/trips', icon: Navigation },
  { label: 'Parcels', href: '/dashboard/parcels', icon: Package },
  { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
  { label: 'Users', href: '/dashboard/users', icon: Users },
  { label: 'KYC', href: '/dashboard/kyc', icon: FileCheck },
  { label: 'Disputes', href: '/dashboard/disputes', icon: AlertTriangle },
  { label: 'Support', href: '/dashboard/support', icon: HeadphonesIcon },
  { label: 'Bulk Ops', href: '/dashboard/bulk', icon: Layers },
  { label: 'Audit Log', href: '/dashboard/audit', icon: ScrollText },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <motion.aside
      initial={false}
      className="fixed left-0 top-0 bottom-0 z-40 hidden w-[260px] flex-col glass-strong md:flex"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border-subtle">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center flex-shrink-0">
          <Package className="w-4 h-4 text-white" />
        </div>
        <span className="font-heading font-bold text-foreground text-lg tracking-tight">CarryGo</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'text-primary'
                  : 'text-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-primary-subtle border border-primary/10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 relative z-10 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
              <span className="relative z-10 truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

    </motion.aside>
  )
}
