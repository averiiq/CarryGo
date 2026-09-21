'use client'

import { TrendingUp, TrendingDown, Minus, Users, Navigation, Package, FileCheck, AlertTriangle, BarChart3, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

type Trend = 'up' | 'down' | 'neutral'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Navigation,
  Package,
  FileCheck,
  AlertTriangle,
  BarChart3,
  Clock,
  TrendingUp,
}

interface AnalyticsCardProps {
  title: string
  value: string | number
  change?: number
  trend?: Trend
  icon?: React.ComponentType<{ className?: string }>
  iconName?: string
  color: string
  bgColor: string
  sparkline?: number[]
}

export default function AnalyticsCard({
  title,
  value,
  change,
  trend = 'neutral',
  icon,
  iconName,
  color,
  bgColor,
  sparkline,
}: AnalyticsCardProps) {
  const Icon = icon || (iconName ? iconMap[iconName] : null) || Package
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-muted-foreground'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="group relative overflow-hidden glass-card p-5"
    >
      {/* Gradient accent on hover */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{title}</p>
          <p className="text-2xl font-heading font-bold text-foreground tracking-tight">
            {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          </p>
        </div>
        <div className={`rounded-xl ${bgColor} p-2.5 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
          <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
        </div>
      </div>

      {sparkline && sparkline.length > 0 && (
        <div className="mt-3 h-8 flex items-end gap-[3px]">
          {sparkline.map((val, i) => {
            const max = Math.max(...sparkline)
            const height = max > 0 ? (val / max) * 100 : 10
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(height, 8)}%` }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] }}
                className={`flex-1 rounded-sm transition-colors ${
                  i === sparkline.length - 1
                    ? trend === 'up' ? 'bg-success' : trend === 'down' ? 'bg-danger' : 'bg-primary'
                    : trend === 'up' ? 'bg-success/20' : trend === 'down' ? 'bg-danger/20' : 'bg-primary/15'
                }`}
              />
            )
          })}
        </div>
      )}

      {typeof change === 'number' && (
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            {change > 0 ? '+' : ''}{change}%
          </span>
          <span className="text-[11px] text-muted-foreground">vs last week</span>
        </div>
      )}
    </motion.div>
  )
}
