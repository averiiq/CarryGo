'use client'

import { useState } from 'react'
import { cancelTrip } from './actions'

type Trip = {
  id: string
  travellerName: string
  route: string
  date: string
  status: string
  createdAt: string
}

const statusStyles: Record<string, string> = {
  active: 'bg-success-subtle text-success',
  completed: 'bg-primary-subtle text-primary',
  cancelled: 'bg-muted-foreground/10 text-muted',
}

export default function TripsTable({ initialTrips }: { initialTrips: Trip[] }) {
  const [trips, setTrips] = useState(initialTrips)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleCancel = async (tripId: string) => {
    if (!confirm('Are you sure you want to cancel this trip?')) return
    setLoadingId(tripId)
    const result = await cancelTrip(tripId)
    if (result.success) {
      setTrips(trips.map(t => t.id === tripId ? { ...t, status: 'cancelled' } : t))
    } else {
      alert(result.error)
    }
    setLoadingId(null)
  }

  return (
    <div className="rounded-2xl bg-surface shadow-[var(--shadow-bento)] border border-border-subtle overflow-hidden">
      <div className="p-6 border-b border-border-subtle flex justify-between items-center">
        <div>
          <h2 className="text-lg font-heading font-semibold text-foreground">Active Trips</h2>
          <p className="text-xs text-muted mt-1">Manage and monitor traveler trips on the platform.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/50 text-muted text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Traveller</th>
              <th className="px-6 py-4">Route</th>
              <th className="px-6 py-4">Travel Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {trips.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  No trips found.
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{trip.travellerName}</td>
                  <td className="px-6 py-4 text-foreground/70">{trip.route}</td>
                  <td className="px-6 py-4 text-foreground/70">{trip.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${statusStyles[trip.status] || 'bg-slate-100 text-muted'}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted">{trip.createdAt}</td>
                  <td className="px-6 py-4 text-right">
                    {trip.status === 'active' && (
                      <button
                        onClick={() => handleCancel(trip.id)}
                        disabled={loadingId === trip.id}
                        className="text-xs font-semibold text-danger hover:text-danger/80 disabled:opacity-50 transition-colors"
                      >
                        {loadingId === trip.id ? 'Canceling...' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
