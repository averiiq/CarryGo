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

const statusStyles: Record<string, string> = {
  open: 'bg-warning-subtle text-warning',
  matched: 'bg-warning-subtle text-warning',
  delivered: 'bg-success-subtle text-success',
  in_transit: 'bg-primary-subtle text-primary',
  failed: 'bg-danger-subtle text-danger',
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
    <div className="rounded-2xl bg-surface shadow-[var(--shadow-bento)] border border-border-subtle overflow-hidden">
      <div className="p-6 border-b border-border-subtle flex justify-between items-center">
        <div>
          <h2 className="text-lg font-heading font-semibold text-foreground">Parcels</h2>
          <p className="text-xs text-muted mt-1">Manage and monitor parcel delivery requests.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/50 text-muted text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Sender</th>
              <th className="px-6 py-4">Route</th>
              <th className="px-6 py-4">Details</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {parcels.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  No parcels found.
                </td>
              </tr>
            ) : (
              parcels.map((parcel) => (
                <tr key={parcel.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{parcel.senderName}</td>
                  <td className="px-6 py-4 text-foreground/70">{parcel.route}</td>
                  <td className="px-6 py-4 text-foreground/70">{parcel.details}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${statusStyles[parcel.status] || 'bg-slate-100 text-muted'}`}>
                      {parcel.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted">{parcel.createdAt}</td>
                  <td className="px-6 py-4 text-right">
                    {['open', 'matched'].includes(parcel.status) && (
                      <button
                        onClick={() => handleCancel(parcel.id)}
                        disabled={loadingId === parcel.id}
                        className="text-xs font-semibold text-danger hover:text-danger/80 disabled:opacity-50 transition-colors"
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
