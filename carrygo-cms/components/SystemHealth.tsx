'use client'

import { motion } from 'framer-motion'
import { Activity, Database, Server, Wifi } from 'lucide-react'

interface HealthMetric {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latency?: number
  uptime?: string
}

interface SystemHealthProps {
  metrics: HealthMetric[]
}

const statusConfig = {
  healthy: { color: 'bg-success', text: 'text-success', label: 'Healthy' },
  degraded: { color: 'bg-warning', text: 'text-warning', label: 'Degraded' },
  down: { color: 'bg-danger', text: 'text-danger', label: 'Down' },
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'API': Server,
  'Database': Database,
  'Supabase': Database,
  'CDN': Wifi,
  'Realtime': Activity,
}

export default function SystemHealth({ metrics }: SystemHealthProps) {
  const allHealthy = metrics.every(m => m.status === 'healthy')

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-bento)] border border-border-subtle">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-semibold text-foreground">System Health</h3>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${allHealthy ? 'text-success' : 'text-warning'}`}>
          <span className={`h-2 w-2 rounded-full ${allHealthy ? 'bg-success' : 'bg-warning'} animate-pulse`} />
          {allHealthy ? 'All systems operational' : 'Issues detected'}
        </span>
      </div>

      <div className="space-y-2">
        {metrics.map((metric, i) => {
          const config = statusConfig[metric.status]
          const Icon = iconMap[metric.name] || Server
          return (
            <motion.div
              key={metric.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{metric.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {metric.latency !== undefined && (
                  <span className="text-xs text-muted tabular-nums">{metric.latency}ms</span>
                )}
                {metric.uptime && (
                  <span className="text-xs text-muted">{metric.uptime}</span>
                )}
                <span className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
