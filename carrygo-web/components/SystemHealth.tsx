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
  healthy: { color: 'bg-success', ring: 'ring-success/20' },
  degraded: { color: 'bg-warning', ring: 'ring-warning/20' },
  down: { color: 'bg-danger', ring: 'ring-danger/20' },
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
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-semibold text-foreground">System Health</h3>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${allHealthy ? 'text-success' : 'text-warning'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${allHealthy ? 'bg-success' : 'bg-warning'}`} />
          {allHealthy ? 'Operational' : 'Issues detected'}
        </span>
      </div>

      <div className="space-y-1.5">
        {metrics.map((metric, i) => {
          const config = statusConfig[metric.status]
          const Icon = iconMap[metric.name] || Server
          return (
            <motion.div
              key={metric.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-surface-elevated/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{metric.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {metric.latency !== undefined && (
                  <span className={`text-[11px] tabular-nums ${
                    metric.latency < 50 ? 'text-success' : metric.latency < 200 ? 'text-warning' : 'text-danger'
                  }`}>
                    {metric.latency}ms
                  </span>
                )}
                {metric.uptime && (
                  <span className="text-[11px] text-muted tabular-nums">{metric.uptime}</span>
                )}
                <span className={`h-2 w-2 rounded-full ring-2 ${config.color} ${config.ring}`} />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
