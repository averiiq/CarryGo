'use client'

import { useState, useMemo, useTransition } from 'react'
import {
  MessageSquare,
  CheckCircle,
  Clock,
  Eye,
  X,
  Search,
  ShieldAlert,
  Archive,
  Mail,
  Phone,
  Copy,
  Check,
  Package,
  UserCheck,
  AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateTicketStatus, assignTicket } from './actions'

export type TicketRow = {
  id: string
  userId?: string
  assignedTo?: string | null
  assigneeName?: string | null
  user: string
  email?: string | null
  phone?: string | null
  subject: string
  description?: string
  status: string
  time: string
}

function parseTicketCategory(subject: string): { category: string | null; cleanSubject: string } {
  const match = subject.match(/^\[(.*?)\]\s*(.*)$/)
  if (match) {
    return { category: match[1], cleanSubject: match[2] }
  }
  return { category: null, cleanSubject: subject }
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null
  const normalized = category.toLowerCase().replace(/[\s-]/g, '_')
  if (normalized.includes('delivery')) {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wider inline-flex items-center gap-1">
        <Package className="w-3 h-3" /> Delivery
      </span>
    )
  }
  if (normalized.includes('payment') || normalized.includes('refund')) {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wider inline-flex items-center gap-1">
        <CheckCircle className="w-3 h-3" /> Payment &amp; Refund
      </span>
    )
  }
  if (normalized.includes('kyc') || normalized.includes('account')) {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase tracking-wider inline-flex items-center gap-1">
        <ShieldAlert className="w-3 h-3" /> KYC &amp; Account
      </span>
    )
  }
  if (normalized.includes('safety') || normalized.includes('conduct')) {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 uppercase tracking-wider inline-flex items-center gap-1">
        <ShieldAlert className="w-3 h-3" /> Safety
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
      {category}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'open':
      return (
        <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-lg bg-danger-subtle text-danger items-center gap-1">
          <Clock className="w-3 h-3" /> Open
        </span>
      )
    case 'in_progress':
      return (
        <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-lg bg-warning-subtle text-warning items-center gap-1">
          <MessageSquare className="w-3 h-3" /> In Progress
        </span>
      )
    case 'resolved':
      return (
        <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-lg bg-success-subtle text-success items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Resolved
        </span>
      )
    case 'closed':
      return (
        <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-lg bg-surface-elevated text-muted items-center gap-1">
          <Archive className="w-3 h-3" /> Closed
        </span>
      )
    default:
      return null
  }
}

export default function SupportTable({
  initialTickets,
  currentAdminId,
}: {
  initialTickets: TicketRow[]
  currentAdminId?: string
}) {
  const [tickets, setTickets] = useState(initialTickets)
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message })
    setTimeout(() => {
      setActionFeedback(null)
    }, 4000)
  }

  const handleStatusChange = (id: string, newStatus: string) => {
    const oldTickets = [...tickets]
    setTickets(tickets.map((t) => (t.id === id ? { ...t, status: newStatus } : t)))

    if (selectedTicket && selectedTicket.id === id) {
      setSelectedTicket({ ...selectedTicket, status: newStatus })
    }

    startTransition(async () => {
      const res = await updateTicketStatus(id, newStatus)
      if (!res.success) {
        setTickets(oldTickets)
        if (selectedTicket && selectedTicket.id === id) {
          setSelectedTicket({
            ...selectedTicket,
            status: oldTickets.find((t) => t.id === id)?.status || 'open',
          })
        }
        showFeedback('error', res.error || 'Failed to update ticket status')
      } else {
        showFeedback('success', `Ticket status updated to ${newStatus.replace('_', ' ')}`)
      }
    })
  }

  const handleAssignTicket = (id: string, targetId: string | null) => {
    startTransition(async () => {
      const res = await assignTicket(id, targetId)
      if (res.success) {
        const isMe = targetId === 'me' || targetId === currentAdminId
        const assigneeName = targetId ? (isMe ? 'You' : 'Assigned') : null

        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, assignedTo: res.assignedTo ?? null, assigneeName } : t))
        )
        if (selectedTicket && selectedTicket.id === id) {
          setSelectedTicket((prev) =>
            prev ? { ...prev, assignedTo: res.assignedTo ?? null, assigneeName } : null
          )
        }
        showFeedback(
          'success',
          targetId ? `Ticket assigned to ${isMe ? 'you' : 'agent'}` : 'Ticket unassigned'
        )
      } else {
        showFeedback('error', res.error || 'Failed to update assignment')
      }
    })
  }

  const handleCopyId = (id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(id)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  // Calculate counts
  const counts = useMemo(() => {
    return {
      all: tickets.length,
      open: tickets.filter((t) => t.status === 'open').length,
      in_progress: tickets.filter((t) => t.status === 'in_progress').length,
      resolved: tickets.filter((t) => t.status === 'resolved').length,
      closed: tickets.filter((t) => t.status === 'closed').length,
    }
  }, [tickets])

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
      const query = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !query ||
        ticket.subject.toLowerCase().includes(query) ||
        ticket.user.toLowerCase().includes(query) ||
        ticket.id.toLowerCase().includes(query) ||
        (ticket.email && ticket.email.toLowerCase().includes(query)) ||
        (ticket.phone && ticket.phone.toLowerCase().includes(query)) ||
        (ticket.description && ticket.description.toLowerCase().includes(query)) ||
        (ticket.assigneeName && ticket.assigneeName.toLowerCase().includes(query))
      return matchesStatus && matchesSearch
    })
  }, [tickets, statusFilter, searchQuery])

  return (
    <>
      <div className="mb-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Operations Desk • Live Incident Triage</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground tracking-tight">
              Customer Support &amp; Disputes
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Investigate customer inquiries, manage handover disputes, and coordinate resolution with direct user updates.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {counts.open > 0 ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-danger-subtle text-danger text-xs font-bold border border-danger/20 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                <span>{counts.open} open ticket{counts.open === 1 ? '' : 's'} require review</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-success-subtle text-success text-xs font-bold border border-success/20 shadow-xs">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>All tickets resolved</span>
              </div>
            )}
          </div>
        </div>

        {/* Interactive KPI Bento Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              statusFilter === 'all'
                ? 'bg-primary/5 border-primary/40 shadow-sm ring-2 ring-primary/20'
                : 'bg-surface border-border-subtle hover:bg-surface-elevated/70 hover:border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted">All Tickets</span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-heading font-black text-foreground">{counts.all}</div>
            <p className="text-[11px] text-muted mt-1">Total inquiries logged</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('open')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              statusFilter === 'open'
                ? 'bg-danger/5 border-danger/40 shadow-sm ring-2 ring-danger/20'
                : 'bg-surface border-border-subtle hover:bg-surface-elevated/70 hover:border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-danger flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-ping" />
                Action Needed
              </span>
              <div className="w-8 h-8 rounded-xl bg-danger-subtle text-danger flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-heading font-black text-danger">{counts.open}</div>
            <p className="text-[11px] text-muted mt-1">Pending review &amp; triage</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              statusFilter === 'in_progress'
                ? 'bg-warning/5 border-warning/40 shadow-sm ring-2 ring-warning/20'
                : 'bg-surface border-border-subtle hover:bg-surface-elevated/70 hover:border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-warning">In Triage</span>
              <div className="w-8 h-8 rounded-xl bg-warning-subtle text-warning flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-heading font-black text-foreground">{counts.in_progress}</div>
            <p className="text-[11px] text-muted mt-1">Active investigation</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('resolved')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              statusFilter === 'resolved'
                ? 'bg-success/5 border-success/40 shadow-sm ring-2 ring-success/20'
                : 'bg-surface border-border-subtle hover:bg-surface-elevated/70 hover:border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-success">Resolved</span>
              <div className="w-8 h-8 rounded-xl bg-success-subtle text-success flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-heading font-black text-foreground">
              {counts.resolved + counts.closed}
            </div>
            <p className="text-[11px] text-muted mt-1">
              {counts.all > 0
                ? `${Math.round(((counts.resolved + counts.closed) / counts.all) * 100)}% resolution rate`
                : 'Zero open disputes'}
            </p>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2 mb-4 border ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-current opacity-70 hover:opacity-100 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: 'all', label: 'All Tickets', count: counts.all },
            { key: 'open', label: 'Open', count: counts.open },
            { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
            { key: 'resolved', label: 'Resolved', count: counts.resolved },
            { key: 'closed', label: 'Closed', count: counts.closed },
          ].map((tab) => {
            const isActive = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-surface border border-border-subtle text-muted hover:text-foreground hover:bg-surface-elevated'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-black/20 text-white' : 'bg-surface-elevated text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by user, email, subject, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-surface border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-surface shadow-[var(--shadow-bento)] border border-border-subtle overflow-hidden">
        <ul className="divide-y divide-border-subtle">
          {filteredTickets.length === 0 ? (
            <li className="p-12 text-center text-muted-foreground text-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'No tickets match the selected filters.'
                : 'No support tickets found.'}
            </li>
          ) : (
            filteredTickets.map((ticket) => {
              const { category, cleanSubject } = parseTicketCategory(ticket.subject)
              const isAssignedToMe = Boolean(
                currentAdminId && ticket.assignedTo && ticket.assignedTo === currentAdminId
              )

              return (
                <li key={ticket.id} className="p-5 hover:bg-surface-elevated/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {category && <CategoryBadge category={category} />}
                        <span className="text-xs font-semibold text-foreground">{ticket.user}</span>
                        {ticket.email && (
                          <span className="text-xs text-muted/80">({ticket.email})</span>
                        )}
                        <span className="text-xs text-muted">· {ticket.time}</span>
                        <span className="text-[10px] font-mono text-muted/80">#{ticket.id.slice(0, 8)}</span>

                        {ticket.assignedTo ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 inline-flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            {isAssignedToMe ? 'Assigned to You' : ticket.assigneeName || 'Assigned'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAssignTicket(ticket.id, 'me')}
                            className="text-[11px] font-medium text-primary hover:underline hover:text-primary-dark transition inline-flex items-center gap-1"
                          >
                            + Assign to me
                          </button>
                        )}
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-foreground break-words">
                        {cleanSubject}
                      </span>
                      {ticket.description && (
                        <p className="text-xs text-muted line-clamp-1 mt-1">
                          {ticket.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      <select
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                        disabled={isPending}
                        className="block px-2.5 py-1.5 text-xs font-medium border border-border rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 disabled:opacity-50"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <StatusBadge status={ticket.status} />
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary-subtle transition-colors"
                        title="View Full Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
              onClick={() => setSelectedTicket(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-heading font-semibold text-foreground">Support Incident Details</h3>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 rounded-xl text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5">
                  <div>
                    {(() => {
                      const { category, cleanSubject } = parseTicketCategory(selectedTicket.subject)
                      return (
                        <div className="mb-2">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {category && <CategoryBadge category={category} />}
                            <StatusBadge status={selectedTicket.status} />
                            {selectedTicket.assignedTo && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 inline-flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                {selectedTicket.assignedTo === currentAdminId
                                  ? 'Assigned to You'
                                  : selectedTicket.assigneeName || 'Assigned'}
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg sm:text-xl font-heading font-bold text-foreground">
                            {cleanSubject}
                          </h4>
                        </div>
                      )
                    })()}

                    {/* User Metadata & Direct Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-surface-elevated border border-border-subtle text-xs">
                      <div>
                        <span className="font-semibold text-foreground">{selectedTicket.user}</span>
                        {selectedTicket.email && (
                          <span className="text-muted ml-1.5">• {selectedTicket.email}</span>
                        )}
                        {selectedTicket.phone && (
                          <span className="text-muted ml-1.5">• {selectedTicket.phone}</span>
                        )}
                        <span className="text-muted ml-1.5">• Reported {selectedTicket.time}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {selectedTicket.email && (
                          <a
                            href={`mailto:${selectedTicket.email}?subject=Re:%20CarryGo%20Support%20Ticket%20%23${selectedTicket.id.slice(0, 8)}&body=Hi%20${encodeURIComponent(selectedTicket.user)},%0A%0ARegarding%20your%20support%20ticket%20(${encodeURIComponent(selectedTicket.subject)}):%0A%0A`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark transition"
                          >
                            <Mail className="w-3 h-3" /> Reply Email
                          </a>
                        )}

                        {selectedTicket.phone && (
                          <a
                            href={`https://wa.me/${selectedTicket.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366] text-white text-[11px] font-semibold hover:opacity-90 transition"
                          >
                            <Phone className="w-3 h-3" /> WhatsApp
                          </a>
                        )}

                        <button
                          onClick={() => handleCopyId(selectedTicket.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-[11px] font-medium text-foreground transition"
                          title="Copy Ticket ID"
                        >
                          {copiedId === selectedTicket.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-muted" />
                          )}
                          <span>{copiedId === selectedTicket.id ? 'Copied' : 'ID'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background p-4 rounded-xl border border-border-subtle">
                    <h5 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Detailed User Report</h5>
                    <p className="text-foreground/90 whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedTicket.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Assignment Controls in Modal */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-subtle text-xs">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-muted" />
                      <span className="text-muted">Assigned Handler:</span>
                      <span className="font-semibold text-foreground">
                        {selectedTicket.assignedTo === currentAdminId
                          ? 'You'
                          : selectedTicket.assigneeName || 'Unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedTicket.assignedTo ? (
                        <button
                          type="button"
                          onClick={() => handleAssignTicket(selectedTicket.id, null)}
                          disabled={isPending}
                          className="px-2.5 py-1 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-muted hover:text-foreground text-[11px] font-medium transition"
                        >
                          Unassign
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAssignTicket(selectedTicket.id, 'me')}
                          disabled={isPending}
                          className="px-2.5 py-1 rounded-lg bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark transition"
                        >
                          Assign to Me
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border-subtle pt-4">
                    <span className="text-xs text-muted font-mono">UUID: {selectedTicket.id}</span>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-muted">Update Status:</label>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                        disabled={isPending}
                        className="block w-40 px-3 py-2 text-sm border border-border rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 disabled:opacity-50"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
