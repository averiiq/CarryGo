'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  User,
  Package,
  Calendar,
  IndianRupee,
  MessageSquare,
  Route,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Lock,
  MessagesSquare,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Dispute } from './page'
import { resolveDispute, addDisputeNote } from './actions'

interface DisputeListProps {
  disputes: Dispute[]
}

export default function DisputeList({ disputes }: DisputeListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)
  const [addingNote, setAddingNote] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'refunded' | 'paid'>('all')

  const isResolved = (dispute: Dispute) => {
    return (
      dispute.message?.includes('[RESOLVED:') ||
      dispute.status === 'completed' ||
      dispute.status === 'cancelled'
    )
  }

  const getResolutionType = (dispute: Dispute): 'refund_sender' | 'pay_traveller' | null => {
    if (dispute.message?.includes('[RESOLVED: refund_sender]') || dispute.status === 'cancelled') return 'refund_sender'
    if (dispute.message?.includes('[RESOLVED: pay_traveller]') || dispute.status === 'completed') return 'pay_traveller'
    return null
  }

  const handleResolve = async (disputeId: string, resolution: 'refund_sender' | 'pay_traveller') => {
    setResolving(disputeId)
    setActionError(null)
    setActionSuccess(null)
    const result = await resolveDispute(disputeId, resolution, note)
    setResolving(null)
    if (result.error) {
      setActionError(result.error)
      return
    }
    setActionSuccess(`Dispute resolved successfully (${resolution === 'refund_sender' ? 'Refunded to Sender' : 'Paid to Traveller'}).`)
    setNote('')
  }

  const handleAddNote = async (disputeId: string) => {
    if (!note.trim()) return
    setAddingNote(disputeId)
    setActionError(null)
    setActionSuccess(null)
    const result = await addDisputeNote(disputeId, note)
    setAddingNote(null)
    if (result.error) {
      setActionError(result.error)
      return
    }
    setActionSuccess('Investigation note recorded successfully.')
    setNote('')
  }

  const filtered = disputes.filter((d) => {
    const resolved = isResolved(d)
    const resType = getResolutionType(d)

    if (statusFilter === 'open' && resolved) return false
    if (statusFilter === 'refunded' && (!resolved || resType !== 'refund_sender')) return false
    if (statusFilter === 'paid' && (!resolved || resType !== 'pay_traveller')) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        d.senderName.toLowerCase().includes(q) ||
        d.travellerName.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.route?.toLowerCase().includes(q) ||
        d.parcelDescription?.toLowerCase().includes(q) ||
        d.message?.toLowerCase().includes(q)
      )
    }

    return true
  })

  return (
    <div className="space-y-4">
      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-surface border border-border">
          {(
            [
              { key: 'all', label: 'All Cases', count: disputes.length },
              { key: 'open', label: 'Awaiting Ruling', count: disputes.filter((d) => !isResolved(d)).length },
              { key: 'refunded', label: 'Refunded to Sender', count: disputes.filter((d) => isResolved(d) && getResolutionType(d) === 'refund_sender').length },
              { key: 'paid', label: 'Paid to Traveller', count: disputes.filter((d) => isResolved(d) && getResolutionType(d) === 'pay_traveller').length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-surface-elevated text-muted'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user, route, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-success-subtle border border-success/20 text-success text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-xl bg-danger-subtle border border-danger/20 text-danger text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {actionError}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-surface border border-border-subtle shadow-[var(--shadow-bento)] p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-success-subtle flex items-center justify-center mb-4">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <h3 className="text-base font-heading font-semibold text-foreground">No matching dispute cases</h3>
          <p className="text-sm text-muted mt-1">No dispute requests match your selected filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((dispute) => {
            const resolved = isResolved(dispute)
            const resType = getResolutionType(dispute)
            const isExpanded = expandedId === dispute.id

            return (
              <div
                key={dispute.id}
                className={`rounded-2xl bg-surface border transition-all ${
                  resolved ? 'border-border-subtle opacity-90' : 'border-danger/30 shadow-[var(--shadow-sm)]'
                }`}
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : dispute.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        resolved
                          ? resType === 'refund_sender'
                            ? 'bg-danger-subtle text-danger'
                            : 'bg-success-subtle text-success'
                          : 'bg-danger-subtle text-danger'
                      }`}
                    >
                      {resolved ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {dispute.senderName} ↔ {dispute.travellerName}
                        </p>
                        {dispute.route && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-elevated text-muted border border-border-subtle">
                            {dispute.route}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                        <span>Case #{dispute.id.slice(0, 8)}</span>
                        <span>•</span>
                        <span className="font-semibold text-foreground">₹{dispute.price}</span>
                        {dispute.parcelDescription && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{dispute.parcelDescription}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {resolved ? (
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                          resType === 'refund_sender'
                            ? 'bg-danger-subtle text-danger border-danger/20'
                            : 'bg-success-subtle text-success border-success/20'
                        }`}
                      >
                        {resType === 'refund_sender' ? 'Refunded to Sender' : 'Paid to Traveller'}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-danger bg-danger-subtle px-2.5 py-1 rounded-lg border border-danger/20">
                        Dispute Open
                      </span>
                    )}

                    <span className="text-xs text-muted hidden sm:inline">
                      {new Date(dispute.updatedAt).toLocaleDateString()}
                    </span>

                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                  </div>
                </button>

                {/* Expanded Details & Ruling Panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 border-t border-border-subtle pt-4 space-y-5 text-sm">
                        {/* Evidence & Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="glass-card p-4 rounded-xl space-y-2">
                            <p className="text-[11px] text-muted font-semibold uppercase tracking-wider">Parties & Amount</p>
                            <div className="text-xs space-y-1">
                              <p>
                                <span className="text-muted">Sender:</span> <strong>{dispute.senderName}</strong>
                              </p>
                              <p>
                                <span className="text-muted">Traveller:</span> <strong>{dispute.travellerName}</strong>
                              </p>
                              <p>
                                <span className="text-muted">Agreed Price:</span>{' '}
                                <strong className="text-foreground">₹{dispute.price}</strong>
                              </p>
                              {dispute.paymentStatus && (
                                <p>
                                  <span className="text-muted">Escrow Status:</span>{' '}
                                  <strong className="capitalize text-primary">{dispute.paymentStatus}</strong>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="glass-card p-4 rounded-xl space-y-2">
                            <p className="text-[11px] text-muted font-semibold uppercase tracking-wider">Parcel & Route</p>
                            <div className="text-xs space-y-1">
                              {dispute.route && (
                                <p>
                                  <span className="text-muted">Route:</span> <strong>{dispute.route}</strong>
                                </p>
                              )}
                              {dispute.parcelCategory && (
                                <p>
                                  <span className="text-muted">Category:</span>{' '}
                                  <strong className="capitalize">{dispute.parcelCategory}</strong>
                                </p>
                              )}
                              {dispute.parcelWeight && (
                                <p>
                                  <span className="text-muted">Weight:</span> <strong>{dispute.parcelWeight} kg</strong>
                                </p>
                              )}
                              {dispute.parcelDescription && (
                                <p className="text-muted truncate">
                                  <span>Item:</span> &ldquo;{dispute.parcelDescription}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="glass-card p-4 rounded-xl space-y-2">
                            <p className="text-[11px] text-muted font-semibold uppercase tracking-wider">Delivery Signals</p>
                            <div className="text-xs space-y-1">
                              <p>
                                <span className="text-muted">Pickup Confirmed:</span>{' '}
                                <strong>{dispute.pickupConfirmed ? 'Yes' : 'No'}</strong>
                              </p>
                              <p>
                                <span className="text-muted">Delivery Status:</span>{' '}
                                <strong className="capitalize">{dispute.deliveryStatus || 'Pending'}</strong>
                              </p>
                              <p>
                                <span className="text-muted">OTP Failure Attempts:</span>{' '}
                                <strong>{dispute.otpAttempts ?? 0}</strong>
                              </p>
                              {dispute.conversationId ? (
                                <div className="pt-1">
                                  <Link
                                    href={`/chat/${dispute.conversationId}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
                                  >
                                    <MessagesSquare className="w-3.5 h-3.5" />
                                    Read Chat Logs
                                    <ExternalLink className="w-3 h-3 ml-0.5" />
                                  </Link>
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-[11px]">No conversation linked</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Request Message & Note Trail */}
                        {dispute.message && (
                          <div className="p-4 rounded-xl bg-background border border-border-subtle space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                              <FileText className="w-3.5 h-3.5" />
                              <span>Audit & Communication History</span>
                            </div>
                            <p className="text-xs text-foreground/80 whitespace-pre-line font-mono bg-surface p-3 rounded-lg border border-border-subtle">
                              {dispute.message}
                            </p>
                          </div>
                        )}

                        {/* Ruling Form (When Open) */}
                        {!resolved ? (
                          <div className="space-y-4 pt-2 border-t border-border-subtle">
                            <div>
                              <label className="text-xs font-bold text-foreground block mb-1.5">
                                Admin Ruling & Investigation Note
                              </label>
                              <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="State findings and justification before issuing final ruling..."
                                className="w-full px-3.5 py-2.5 text-xs border border-border rounded-xl resize-none bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                                rows={2}
                              />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <button
                                type="button"
                                disabled={addingNote === dispute.id || !note.trim()}
                                onClick={() => handleAddNote(dispute.id)}
                                className="px-3.5 py-2 text-xs font-semibold text-foreground bg-surface-elevated border border-border rounded-xl hover:bg-surface-elevated/80 disabled:opacity-50 transition-colors"
                              >
                                {addingNote === dispute.id ? 'Recording...' : 'Add Investigation Note Only'}
                              </button>

                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleResolve(dispute.id, 'refund_sender')}
                                  disabled={resolving === dispute.id}
                                  className="px-4 py-2 text-xs font-semibold bg-danger text-white rounded-xl hover:bg-danger/90 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                  {resolving === dispute.id ? 'Processing...' : 'Rule: Refund Sender'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResolve(dispute.id, 'pay_traveller')}
                                  disabled={resolving === dispute.id}
                                  className="px-4 py-2 text-xs font-semibold bg-success text-white rounded-xl hover:bg-success/90 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                  {resolving === dispute.id ? 'Processing...' : 'Rule: Pay Traveller'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center justify-between text-xs">
                            <span className="text-muted">
                              This dispute has been officially closed and audited.
                            </span>
                            <span className="font-semibold text-foreground">
                              Final Action: {resType === 'refund_sender' ? 'Refunded Sender' : 'Paid Traveller'}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
