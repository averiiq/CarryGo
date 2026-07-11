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
  const trendBg = trend === 'up' ? 'bg-success-subtle' : trend === 'down' ? 'bg-danger-subtle' : 'bg-slate-50'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="group relative overflow-hidden rounded-2xl bg-surface p-6 shadow-[var(--shadow-bento)] border border-border-subtle hover:border-border hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="text-3xl font-heading font-bold text-foreground tracking-tight">
            {value}
          </p>
        </div>
        <div className={`rounded-2xl ${bgColor} p-3 transition-transform group-hover:scale-110 duration-300`}>
          <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
        </div>
      </div>

      {sparkline && sparkline.length > 0 && (
        <div className="mt-4 h-8 flex items-end gap-[2px]">
          {sparkline.map((val, i) => {
            const max = Math.max(...sparkline)
            const height = max > 0 ? (val / max) * 100 : 0
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className={`flex-1 rounded-sm ${trend === 'up' ? 'bg-success/20' : trend === 'down' ? 'bg-danger/20' : 'bg-primary/10'}`}
              />
            )
          })}
        </div>
      )}

      {typeof change === 'number' && (
        <div className="mt-4 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-lg ${trendBg} px-2 py-0.5 text-xs font-semibold ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            {change > 0 ? '+' : ''}{change}%
          </span>
          <span className="text-xs text-muted-foreground">vs last period</span>
        </div>
      )}
    </motion.div>
  )
}
