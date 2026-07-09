'use client'

import { useState } from 'react'
import { cancelParcel } from './actions'

type Parcel = {
  id: string
  senderName: string
  route: string
  details: string
  status: string
  createdAt: string
}

export default function ParcelsTable({ initialParcels }: { initialParcels: Parcel[] }) {
  const [parcels, setParcels] = useState(initialParcels)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleCancel = async (parcelId: string) => {
    if (!confirm('Are you sure you want to cancel this parcel request?')) return
    setLoadingId(parcelId)
    const result = await cancelParcel(parcelId)
    if (result.success) {
      setParcels(parcels.map(p => p.id === parcelId ? { ...p, status: 'failed' } : p))
    } else {
      alert(result.error)
    }
    setLoadingId(null)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Parcels</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor parcel delivery requests on the platform.</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">Sender</th>
              <th className="px-6 py-4">Route</th>
              <th className="px-6 py-4">Details</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Created On</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parcels.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No parcels found.
                </td>
              </tr>
            ) : (
              parcels.map((parcel) => (
                <tr key={parcel.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{parcel.senderName}</td>
                  <td className="px-6 py-4 text-gray-600">{parcel.route}</td>
                  <td className="px-6 py-4 text-gray-600">{parcel.details}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      ['open', 'matched'].includes(parcel.status) ? 'bg-amber-100 text-amber-700' :
                      parcel.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                      parcel.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {parcel.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{parcel.createdAt}</td>
                  <td className="px-6 py-4 text-right">
                    {['open', 'matched'].includes(parcel.status) && (
                      <button
                        onClick={() => handleCancel(parcel.id)}
                        disabled={loadingId === parcel.id}
                        className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        {loadingId === parcel.id ? 'Canceling...' : 'Cancel'}
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
