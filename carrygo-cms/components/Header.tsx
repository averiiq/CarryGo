'use client'

import { LogOut, Bell, Search, Command } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import CommandPalette from './CommandPalette'

const routeTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/trips': 'Trips',
  '/dashboard/parcels': 'Parcels',
  '/dashboard/kyc': 'KYC Verification',
  '/dashboard/users': 'Users',
  '/dashboard/payments': 'Payments',
  '/dashboard/disputes': 'Disputes',
  '/dashboard/bulk': 'Bulk Operations',
  '/dashboard/audit': 'Audit Log',
  '/dashboard/support': 'Support',
  '/dashboard/settings': 'Settings',
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const title = routeTitles[pathname] || 'Dashboard'

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface/80 backdrop-blur-sm px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-heading font-semibold text-foreground">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-border bg-slate-50/50 px-3 py-1.5 text-sm text-muted hover:border-primary/30 hover:text-foreground transition-all"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:flex items-center gap-0.5 rounded-md bg-white border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          <button className="relative rounded-xl p-2 text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
          </button>

          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-sm font-bold shadow-sm">
            A
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl p-2 text-muted-foreground hover:bg-danger-subtle hover:text-danger transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </>
  )
}
