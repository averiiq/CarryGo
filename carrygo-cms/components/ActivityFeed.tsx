'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Navigation, UserCheck, AlertTriangle, Shield, DollarSign } from 'lucide-react'

type ActivityType = 'trip_created' | 'parcel_posted' | 'delivery_completed' | 'kyc_submitted' | 'dispute_opened' | 'payment_released'

interface Activity {
  id: string
  type: ActivityType
  user: string
  detail: string
  time: string
  isNew?: boolean
}

const typeConfig: Record<ActivityType, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  trip_created: { icon: Navigation, color: 'text-primary', bg: 'bg-primary-subtle' },
  parcel_posted: { icon: Package, color: 'text-accent', bg: 'bg-accent-subtle' },
  delivery_completed: { icon: DollarSign, color: 'text-success', bg: 'bg-success-subtle' },
  kyc_submitted: { icon: Shield, color: 'text-warning', bg: 'bg-warning-subtle' },
  dispute_opened: { icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger-subtle' },
  payment_released: { icon: DollarSign, color: 'text-success', bg: 'bg-success-subtle' },
}

interface ActivityFeedProps {
  initialActivities: Activity[]
}

export default function ActivityFeed({ initialActivities }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-bento)] border border-border-subtle h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-semibold text-foreground">Live Activity</h3>
        <span className="flex items-center gap-1.5 text-xs text-success font-medium">
          <span className={`h-2 w-2 rounded-full bg-success transition-opacity duration-1000 ${pulse ? 'opacity-100' : 'opacity-40'}`} />
          Live
        </span>
      </div>

      <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {activities.map((activity, i) => {
            const config = typeConfig[activity.type]
            const Icon = config.icon
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50/50 transition-colors"
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
              </motion.div>
            )
          })}
        </AnimatePresence>

        {activities.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No recent activity</p>
        )}
      </div>
    </div>
  )
}
