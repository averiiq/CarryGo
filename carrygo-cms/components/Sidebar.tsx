'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  FileCheck,
  LifeBuoy,
  Settings,
  Navigation,
  Package,
  BarChart3,
  AlertTriangle,
  Layers,
  Shield,
  CreditCard,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import clsx from 'clsx'

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Trips', href: '/dashboard/trips', icon: Navigation },
  { name: 'Parcels', href: '/dashboard/parcels', icon: Package },
  { name: 'KYC', href: '/dashboard/kyc', icon: FileCheck },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
  { name: 'Disputes', href: '/dashboard/disputes', icon: AlertTriangle },
  { name: 'Bulk Ops', href: '/dashboard/bulk', icon: Layers },
  { name: 'Audit Log', href: '/dashboard/audit', icon: Shield },
  { name: 'Support', href: '/dashboard/support', icon: LifeBuoy },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.aside
      animate={{ width: expanded ? 220 : 72 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="flex h-full flex-col border-r border-border bg-surface overflow-hidden relative z-30"
    >
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-border-subtle px-3">
        <AnimatePresence mode="wait">
          {expanded ? (
            <motion.span
              key="full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-lg font-heading font-bold text-primary tracking-tight"
            >
              CarryGo
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-lg font-heading font-bold text-primary"
            >
              C
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto py-4 px-2 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={clsx(
                'group relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-subtle text-primary shadow-sm'
                  : 'text-muted hover:bg-slate-50 hover:text-foreground'
              )}
            >
              <Icon
                className={clsx(
                  'shrink-0 h-5 w-5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
                aria-hidden="true"
              />
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="ml-3 whitespace-nowrap overflow-hidden"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-primary-subtle border border-primary/10"
                  style={{ zIndex: -1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border-subtle p-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center rounded-xl p-2.5 text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronsLeft className="h-5 w-5" />
          ) : (
            <ChevronsRight className="h-5 w-5" />
          )}
        </button>
      </div>
    </motion.aside>
  )
}
