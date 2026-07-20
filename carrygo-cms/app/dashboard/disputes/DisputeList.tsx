'use client'

import { useState } from 'react'
import { User, Package, Calendar, DollarSign, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
      <div className="rounded-2xl bg-surface border border-border-subtle shadow-[var(--shadow-bento)] p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-success-subtle flex items-center justify-center mb-4">
          <Package className="h-6 w-6 text-success" />
        </div>
        <h3 className="text-base font-heading font-semibold text-foreground">No open disputes</h3>
        <p className="text-sm text-muted mt-1">All deliveries are running smoothly.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {disputes.map(dispute => (
        <div key={dispute.id} className="rounded-2xl bg-surface border border-border-subtle shadow-[var(--shadow-sm)] overflow-hidden">
          <button
            onClick={() => setExpandedId(expandedId === dispute.id ? null : dispute.id)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-danger-subtle flex items-center justify-center">
                <Package className="h-5 w-5 text-danger" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">
                  {dispute.senderName} → {dispute.travellerName}
                </p>
                <p className="text-xs text-muted">
                  #{dispute.id.slice(0, 8)} · ₹{dispute.price}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-danger bg-danger-subtle px-2.5 py-1 rounded-lg">
                Failed
              </span>
              <span className="text-xs text-muted">
                {new Date(dispute.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </button>

          <AnimatePresence>
            {expandedId === dispute.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-5 border-t border-border-subtle pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted">Sender: <strong className="text-foreground">{dispute.senderName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted">Traveller: <strong className="text-foreground">{dispute.travellerName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted">Amount: <strong className="text-foreground">₹{dispute.price}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted">Created: {new Date(dispute.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {dispute.message && (
                    <div className="flex items-start gap-2 p-3 bg-background rounded-xl">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-foreground/70">{dispute.message}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted block mb-1.5">Resolution Note</label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Add a note about the resolution..."
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl resize-none bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolve(dispute.id, 'refund_sender')}
                      disabled={resolving === dispute.id}
                      className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      Refund Sender
                    </button>
                    <button
                      onClick={() => handleResolve(dispute.id, 'pay_traveller')}
                      disabled={resolving === dispute.id}
                      className="px-4 py-2 text-xs font-semibold bg-success text-white rounded-xl hover:bg-success/90 disabled:opacity-50 transition-colors"
                    >
                      Pay Traveller
                    </button>
                    <button
                      onClick={() => handleResolve(dispute.id, 'split')}
                      disabled={resolving === dispute.id}
                      className="px-4 py-2 text-xs font-semibold bg-warning text-white rounded-xl hover:bg-warning/90 disabled:opacity-50 transition-colors"
                    >
                      Split 50/50
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
