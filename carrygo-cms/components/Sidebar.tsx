'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileCheck, LifeBuoy, Settings, Navigation, Package, BarChart3, AlertTriangle, Layers } from 'lucide-react'
import clsx from 'clsx'

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Trips', href: '/dashboard/trips', icon: Navigation },
  { name: 'Parcels', href: '/dashboard/parcels', icon: Package },
  { name: 'KYC Verification', href: '/dashboard/kyc', icon: FileCheck },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Disputes', href: '/dashboard/disputes', icon: AlertTriangle },
  { name: 'Bulk Operations', href: '/dashboard/bulk', icon: Layers },
  { name: 'Support', href: '/dashboard/support', icon: LifeBuoy },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">CarryGo CMS</h1>
      </div>
      <nav className="flex flex-1 flex-col overflow-y-auto p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100',
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors'
              )}
            >
              <Icon
                className={clsx(
                  isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500',
                  'mr-3 h-5 w-5 shrink-0'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
