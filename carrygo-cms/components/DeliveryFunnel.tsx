'use client'

import { motion } from 'framer-motion'

interface FunnelStep {
  label: string
  count: number
  color: string
}

interface DeliveryFunnelProps {
  steps: FunnelStep[]
}

export default function DeliveryFunnel({ steps }: DeliveryFunnelProps) {
  const maxCount = Math.max(...steps.map(s => s.count), 1)

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-bento)] border border-border-subtle">
      <h3 className="text-sm font-heading font-semibold text-foreground mb-5">Delivery Funnel</h3>

      <div className="space-y-3">
        {steps.map((step, i) => {
          const widthPercent = (step.count / maxCount) * 100
          const conversionRate = i > 0 ? Math.round((step.count / steps[i - 1].count) * 100) : 100
          return (
            <div key={step.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground tabular-nums">{step.count.toLocaleString()}</span>
                  {i > 0 && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                      conversionRate >= 70 ? 'bg-success-subtle text-success' :
                      conversionRate >= 40 ? 'bg-warning-subtle text-warning' :
                      'bg-danger-subtle text-danger'
                    }`}>
                      {conversionRate}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercent}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: [0.4, 0, 0.2, 1] }}
                  className={`h-full rounded-full ${step.color}`}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Overall conversion</span>
          <span className="font-bold text-foreground">
            {steps.length > 1 ? Math.round((steps[steps.length - 1].count / steps[0].count) * 100) : 100}%
          </span>
        </div>
      </div>
    </div>
  )
}
