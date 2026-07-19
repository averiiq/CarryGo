'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

interface ChartDataPoint {
  name: string
  trips: number
  parcels: number
}

export default function DashboardChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="h-[280px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="tripsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="parcelsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--success)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface-elevated)',
              backdropFilter: 'blur(8px)',
              boxShadow: 'var(--shadow-lg)',
              padding: '10px 14px',
              fontSize: '12px',
            }}
            labelStyle={{ color: 'var(--foreground)', fontWeight: 600, marginBottom: 4 }}
            itemStyle={{ color: 'var(--muted)', padding: 0 }}
          />
          <Area
            type="monotone"
            dataKey="trips"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#tripsGradient)"
            name="Trips"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--surface-solid)', stroke: 'var(--primary)' }}
          />
          <Area
            type="monotone"
            dataKey="parcels"
            stroke="var(--success)"
            strokeWidth={2}
            fill="url(#parcelsGradient)"
            name="Parcels"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--surface-solid)', stroke: 'var(--success)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
