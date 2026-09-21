'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Wrench, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { getClientPlatformConfig } from '@/lib/platform-config'

export function MaintenanceBanner() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Initial fetch
    void getClientPlatformConfig().then((cfg) => {
      setMaintenanceMode(cfg.maintenanceMode)
    })

    // Subscribe to realtime updates on app_config
    const supabase = createClient()
    const channel = supabase
      .channel('app_config_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_config' },
        () => {
          void getClientPlatformConfig().then((cfg) => {
            setMaintenanceMode(cfg.maintenanceMode)
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  if (!maintenanceMode || dismissed) {
    return null
  }

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 shadow-md border-b border-amber-600/30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm font-medium">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-lg bg-amber-600/20 text-slate-950 shrink-0">
            <Wrench className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <span className="font-bold">Scheduled System Maintenance:</span>{' '}
            <span>
              The platform is currently undergoing administrative updates. You can browse routes, but new bookings and payments are temporarily queued.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md hover:bg-amber-600/20 text-slate-950 transition-colors shrink-0 cursor-pointer"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
