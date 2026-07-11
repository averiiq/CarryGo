'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
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
      className="h-[320px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="tripsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="parcelsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)',
              padding: '12px 16px',
              fontSize: '13px',
            }}
          />
          <Area
            type="monotone"
            dataKey="trips"
            stroke="#6366f1"
            strokeWidth={2.5}
            fill="url(#tripsGradient)"
            name="Trips"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
          />
          <Area
            type="monotone"
            dataKey="parcels"
            stroke="#10b981"
            strokeWidth={2.5}
            fill="url(#parcelsGradient)"
            name="Parcels"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
