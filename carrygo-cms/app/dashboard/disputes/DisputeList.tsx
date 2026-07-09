'use client'

import { useState } from 'react'
import { User, Package, Calendar, DollarSign, MessageSquare } from 'lucide-react'
import type { Dispute } from './page'
import { resolveDispute } from './actions'

interface DisputeListProps {
  disputes: Dispute[]
}

export default function DisputeList({ disputes }: DisputeListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const handleResolve = async (disputeId: string, resolution: 'refund_sender' | 'pay_traveller' | 'split') => {
    setResolving(disputeId)
    await resolveDispute(disputeId, resolution, note)
    setResolving(null)
    setNote('')
    setExpandedId(null)
  }

  if (disputes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
          <Package className="h-6 w-6 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No open disputes</h3>
        <p className="text-sm text-gray-500 mt-1">All deliveries are running smoothly.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {disputes.map(dispute => (
        <div key={dispute.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setExpandedId(expandedId === dispute.id ? null : dispute.id)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Package className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">
                  {dispute.senderName} → {dispute.travellerName}
                </p>
                <p className="text-xs text-gray-500">
                  Request #{dispute.id.slice(0, 8)} · ₹{dispute.price}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                Failed
              </span>
              <span className="text-xs text-gray-400">
                {new Date(dispute.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </button>

          {expandedId === dispute.id && (
            <div className="px-6 pb-5 border-t border-gray-100 pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Sender: <strong>{dispute.senderName}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Traveller: <strong>{dispute.travellerName}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Amount: <strong>₹{dispute.price}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Created: {new Date(dispute.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {dispute.message && (
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                  <p className="text-sm text-gray-600">{dispute.message}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Resolution Note</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note about the resolution..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResolve(dispute.id, 'refund_sender')}
                  disabled={resolving === dispute.id}
                  className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Refund Sender
                </button>
                <button
                  onClick={() => handleResolve(dispute.id, 'pay_traveller')}
                  disabled={resolving === dispute.id}
                  className="px-4 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  Pay Traveller
                </button>
                <button
                  onClick={() => handleResolve(dispute.id, 'split')}
                  disabled={resolving === dispute.id}
                  className="px-4 py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  Split 50/50
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
