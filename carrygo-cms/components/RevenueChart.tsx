'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

interface RevenueDataPoint {
  name: string
  revenue: number
  payouts: number
}

interface RevenueChartProps {
  data: RevenueDataPoint[]
  totalRevenue: number
  totalPayouts: number
  period: string
}

export default function RevenueChart({ data, totalRevenue, totalPayouts, period }: RevenueChartProps) {
  const profit = totalRevenue - totalPayouts

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-surface p-6 shadow-[var(--shadow-bento)] border border-border-subtle"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-heading font-semibold text-foreground">Revenue Overview</h3>
          <p className="text-xs text-muted mt-0.5">{period}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-lg font-heading font-bold text-foreground">₹{totalRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider">Revenue</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-heading font-bold text-success">₹{profit.toLocaleString()}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider">Net</p>
          </div>
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="payoutsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.06)',
                padding: '10px 14px',
                fontSize: '12px',
              }}
              formatter={(value) => [`₹${Number(value).toLocaleString()}`, undefined]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              name="Revenue"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="payouts"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#payoutsGradient)"
              name="Payouts"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border-subtle">
        <span className="flex items-center gap-2 text-xs text-muted">
          <span className="h-2 w-6 rounded-full bg-primary" /> Revenue
        </span>
        <span className="flex items-center gap-2 text-xs text-muted">
          <span className="h-2 w-6 rounded-full bg-accent" /> Payouts
        </span>
      </div>
    </motion.div>
  )
}
