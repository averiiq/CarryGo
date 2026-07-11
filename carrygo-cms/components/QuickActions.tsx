'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileCheck, AlertTriangle, Users, Package, ArrowRight } from 'lucide-react'

interface QuickAction {
  label: string
  description: string
  href: string
  iconName: string
  count?: number
  urgency: 'high' | 'medium' | 'low'
}

interface QuickActionsProps {
  actions: QuickAction[]
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileCheck,
  AlertTriangle,
  Users,
  Package,
}

const urgencyStyles = {
  high: 'border-danger/20 bg-danger-subtle/30',
  medium: 'border-warning/20 bg-warning-subtle/30',
  low: 'border-border-subtle bg-surface',
}

export default function QuickActions({ actions }: QuickActionsProps) {
  const router = useRouter()

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-bento)] border border-border-subtle">
      <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Needs Attention</h3>

      <div className="space-y-2">
        {actions.map((action, i) => {
          const Icon = iconMap[action.iconName] || Package
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(action.href)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm group ${urgencyStyles[action.urgency]}`}
            >
              <div className={`shrink-0 rounded-lg p-2 ${
                action.urgency === 'high' ? 'bg-danger/10' :
                action.urgency === 'medium' ? 'bg-warning/10' : 'bg-primary/10'
              }`}>
                <Icon className={`h-4 w-4 ${
                  action.urgency === 'high' ? 'text-danger' :
                  action.urgency === 'medium' ? 'text-warning' : 'text-primary'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold text-foreground">{action.label}</p>
                <p className="text-[10px] text-muted">{action.description}</p>
              </div>
              {action.count !== undefined && action.count > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  action.urgency === 'high' ? 'bg-danger/10 text-danger' :
                  action.urgency === 'medium' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                }`}>
                  {action.count}
                </span>
              )}
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
