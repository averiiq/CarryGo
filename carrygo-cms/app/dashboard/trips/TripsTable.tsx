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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Active Trips</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor traveler trips on the platform.</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">Traveller</th>
              <th className="px-6 py-4">Route</th>
              <th className="px-6 py-4">Travel Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Created On</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {trips.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No trips found.
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{trip.travellerName}</td>
                  <td className="px-6 py-4 text-gray-600">{trip.route}</td>
                  <td className="px-6 py-4 text-gray-600">{trip.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      trip.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      trip.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{trip.createdAt}</td>
                  <td className="px-6 py-4 text-right">
                    {trip.status === 'active' && (
                      <button
                        onClick={() => handleCancel(trip.id)}
                        disabled={loadingId === trip.id}
                        className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
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
