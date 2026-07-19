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

export default function QuickActions({ actions }: QuickActionsProps) {
  const router = useRouter()

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Needs Attention</h3>

      <div className="space-y-2">
        {actions.map((action, i) => {
          const Icon = iconMap[action.iconName] || Package
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => router.push(action.href)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all group ${
                action.urgency === 'high'
                  ? 'border-danger/15 hover:border-danger/30 hover:bg-danger-subtle/30'
                  : action.urgency === 'medium'
                    ? 'border-warning/15 hover:border-warning/30 hover:bg-warning-subtle/30'
                    : 'border-border-subtle hover:border-border hover:bg-surface-elevated/50'
              }`}
            >
              <div className={`shrink-0 rounded-lg p-2 ${
                action.urgency === 'high' ? 'bg-danger-subtle' :
                action.urgency === 'medium' ? 'bg-warning-subtle' : 'bg-primary-subtle'
              }`}>
                <Icon className={`h-3.5 w-3.5 ${
                  action.urgency === 'high' ? 'text-danger' :
                  action.urgency === 'medium' ? 'text-warning' : 'text-primary'
                }`} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{action.label}</p>
                <p className="text-[10px] text-muted truncate">{action.description}</p>
              </div>
              {action.count !== undefined && action.count > 0 && (
                <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                  action.urgency === 'high' ? 'bg-danger-subtle text-danger' :
                  action.urgency === 'medium' ? 'bg-warning-subtle text-warning' : 'bg-primary-subtle text-primary'
                }`}>
                  {action.count}
                </span>
              )}
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
