'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartDataPoint {
  name: string
  trips: number
  parcels: number
}

export default function DashboardChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Weekly Activity</h2>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="trips" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Trips Posted" />
            <Bar dataKey="parcels" fill="#10B981" radius={[4, 4, 0, 0]} name="Parcels Listed" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
