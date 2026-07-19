'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Navigation, UserCheck, AlertTriangle, Shield, DollarSign, Radio } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type ActivityType = 'trip_created' | 'parcel_posted' | 'delivery_completed' | 'kyc_submitted' | 'dispute_opened' | 'payment_released'

interface Activity {
  id: string
  type: ActivityType
  user: string
  detail: string
  time: string
  isNew?: boolean
}

const typeConfig: Record<ActivityType, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  trip_created: { icon: Navigation, color: 'text-primary', bg: 'bg-primary-subtle', label: 'Trip' },
  parcel_posted: { icon: Package, color: 'text-accent', bg: 'bg-accent-subtle', label: 'Parcel' },
  delivery_completed: { icon: DollarSign, color: 'text-success', bg: 'bg-success-subtle', label: 'Delivered' },
  kyc_submitted: { icon: Shield, color: 'text-warning', bg: 'bg-warning-subtle', label: 'KYC' },
  dispute_opened: { icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger-subtle', label: 'Dispute' },
  payment_released: { icon: DollarSign, color: 'text-success', bg: 'bg-success-subtle', label: 'Payment' },
}

interface ActivityFeedProps {
  initialActivities: Activity[]
}

export default function ActivityFeed({ initialActivities }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [isLive, setIsLive] = useState(true)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('realtime-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, (payload) => {
        const req = payload.new as Record<string, unknown>
        const newActivity: Activity = {
          id: (req.id as string) || `rt-${Date.now()}`,
          type: 'parcel_posted',
          user: 'New user',
          detail: 'created a delivery request',
          time: 'Just now',
          isNew: true,
        }
        setActivities(prev => [newActivity, ...prev.slice(0, 14)])
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="glass-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-semibold text-foreground">Live Activity</h3>
        <span className="flex items-center gap-1.5 text-[11px] font-medium">
          <span className={`relative flex h-2 w-2 ${isLive ? '' : 'opacity-40'}`}>
            <span className={`absolute inset-0 rounded-full bg-success ${isLive ? 'animate-ping opacity-75' : ''}`} />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className={isLive ? 'text-success' : 'text-muted'}>
            {isLive ? 'Connected' : 'Connecting...'}
          </span>
        </span>
      </div>

      <div className="flex-1 space-y-0.5 max-h-[400px] overflow-y-auto -mx-2 px-2">
        <AnimatePresence initial={false}>
          {activities.map((activity, i) => {
            const config = typeConfig[activity.type]
            const Icon = config.icon
            return (
              <motion.div
                key={activity.id}
                initial={activity.isNew ? { opacity: 0, y: -20, scale: 0.95 } : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.3, delay: activity.isNew ? 0 : i * 0.02 }}
                className={`flex items-start gap-3 py-2.5 px-2.5 rounded-xl transition-colors hover:bg-surface-elevated/50 ${activity.isNew ? 'bg-primary-subtle/30' : ''}`}
              >
                <div className={`shrink-0 rounded-lg p-1.5 ${config.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground leading-relaxed">
                    <span className="font-semibold">{activity.user}</span>{' '}
                    <span className="text-muted">{activity.detail}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{activity.time}</p>
                </div>
                {activity.isNew && (
                  <span className="shrink-0 mt-1 px-1.5 py-0.5 rounded-md bg-primary text-[9px] font-bold text-primary-foreground uppercase">
                    New
                  </span>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>

        {activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Radio className="h-6 w-6 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No activity yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
