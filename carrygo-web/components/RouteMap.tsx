'use client'

import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'

interface RoutePoint {
  city: string
  count: number
  type: 'origin' | 'destination'
}

interface RouteMapProps {
  topOrigins: RoutePoint[]
  topDestinations: RoutePoint[]
  totalActiveRoutes: number
}

export default function RouteMap({ topOrigins, topDestinations, totalActiveRoutes }: RouteMapProps) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-bento)] border border-border-subtle">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-heading font-semibold text-foreground">Route Heatmap</h3>
        <span className="text-xs font-medium text-primary bg-primary-subtle px-2.5 py-1 rounded-lg">
          {totalActiveRoutes} active routes
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted mb-3">Top Origins</p>
          <div className="space-y-2">
            {topOrigins.map((point, i) => {
              const maxCount = Math.max(...topOrigins.map(p => p.count), 1)
              const width = (point.count / maxCount) * 100
              return (
                <motion.div
                  key={point.city}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-primary" />
                      {point.city}
                    </span>
                    <span className="text-[10px] font-bold text-muted tabular-nums">{point.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-primary/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted mb-3">Top Destinations</p>
          <div className="space-y-2">
            {topDestinations.map((point, i) => {
              const maxCount = Math.max(...topDestinations.map(p => p.count), 1)
              const width = (point.count / maxCount) * 100
              return (
                <motion.div
                  key={point.city}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-accent" />
                      {point.city}
                    </span>
                    <span className="text-[10px] font-bold text-muted tabular-nums">{point.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-accent/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60"
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
