'use client'

import { LogOut, Bell, Search, Command } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import CommandPalette from './CommandPalette'
import ThemeToggle from './ThemeToggle'

const routeTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/trips': 'Trips',
  '/dashboard/parcels': 'Parcels',
  '/dashboard/payments': 'Payments',
  '/dashboard/users': 'Users',
  '/dashboard/kyc': 'KYC Verification',
  '/dashboard/disputes': 'Disputes',
  '/dashboard/support': 'Support',
  '/dashboard/bulk': 'Bulk Operations',
  '/dashboard/audit': 'Audit Log',
  '/dashboard/settings': 'Settings',
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [showPalette, setShowPalette] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const update = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowPalette(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const pageTitle = routeTitles[pathname] || 'Dashboard'

  return (
    <>
      <header className="sticky top-0 z-30 glass border-b border-border-subtle">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Left: Page title */}
          <div>
            <h1 className="text-lg font-heading font-semibold text-foreground">{pageTitle}</h1>
            <p className="text-xs text-muted">{currentTime}</p>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Search trigger */}
            <button
              onClick={() => setShowPalette(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-solid border border-border text-muted text-sm hover:border-border-strong hover:text-foreground transition-all duration-200"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background text-[10px] font-medium text-muted-foreground border border-border-subtle">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>

            <ThemeToggle />

            {/* Notifications */}
            <button className="relative p-2 rounded-xl bg-surface-solid border border-border hover:border-border-strong transition-all duration-200 hover:shadow-sm">
              <Bell className="w-4 h-4 text-muted" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger" />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-surface-solid border border-border hover:border-danger/30 hover:bg-danger-subtle transition-all duration-200 group"
            >
              <LogOut className="w-4 h-4 text-muted group-hover:text-danger" />
            </button>
          </div>
        </div>
      </header>

      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}
    </>
  )
}
