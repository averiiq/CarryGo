'use client'

import AnalyticsCard from './AnalyticsCard'
import { Users, Navigation, Package, FileCheck, AlertTriangle, CreditCard, Sparkles, HeadphonesIcon } from 'lucide-react'

type Trend = 'up' | 'down' | 'neutral'

type IconName = 'Users' | 'Navigation' | 'Package' | 'FileCheck' | 'AlertTriangle' | 'CreditCard' | 'Sparkles' | 'HeadphonesIcon'

const iconMap: Record<IconName, React.ComponentType<{ className?: string }>> = {
  Users,
  Navigation,
  Package,
  FileCheck,
  AlertTriangle,
  CreditCard,
  Sparkles,
  HeadphonesIcon,
}

interface StatItem {
  title: string
  value: string | number
  change?: number
  trend?: Trend
  iconName: IconName
  color: string
  bgColor: string
  sparkline?: number[]
}

interface BentoStatsProps {
  stats: StatItem[]
}

export default function BentoStats({ stats }: BentoStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat) => (
        <AnalyticsCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          change={stat.change}
          trend={stat.trend}
          icon={iconMap[stat.iconName]}
          color={stat.color}
          bgColor={stat.bgColor}
          sparkline={stat.sparkline}
        />
      ))}
    </div>
  )
}
