import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type Trend = 'up' | 'down' | 'neutral'

interface AnalyticsCardProps {
  title: string
  value: string | number
  change?: number
  trend?: Trend
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

export default function AnalyticsCard({
  title,
  value,
  change,
  trend = 'neutral',
  icon: Icon,
  color,
  bgColor,
}: AnalyticsCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'

  return (
    <div className="overflow-hidden rounded-xl bg-white px-6 py-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="truncate text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg ${bgColor} p-3`}>
          <Icon className={`h-6 w-6 ${color}`} aria-hidden="true" />
        </div>
      </div>
      {typeof change === 'number' && (
        <div className="mt-4 flex items-center gap-1 text-sm">
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
          <span className={`font-medium ${trendColor}`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
          <span className="text-gray-400 ml-1">vs last period</span>
        </div>
      )}
    </div>
  )
}
