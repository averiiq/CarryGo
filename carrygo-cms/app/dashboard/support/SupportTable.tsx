'use client'

import { useState } from 'react'
import { MessageSquare, CheckCircle, Clock, Eye, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateTicketStatus } from './actions'

type TicketRow = {
  id: string
  user: string
  subject: string
  description?: string
  status: string
  time: string
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
    default:
      return null
  }
}

export default function SupportTable({ initialTickets }: { initialTickets: TicketRow[] }) {
  const [tickets, setTickets] = useState(initialTickets)
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null)

  const handleStatusChange = async (id: string, newStatus: string) => {
    const oldTickets = [...tickets]
    setTickets(tickets.map((t) => (t.id === id ? { ...t, status: newStatus } : t)))

    if (selectedTicket && selectedTicket.id === id) {
      setSelectedTicket({ ...selectedTicket, status: newStatus })
    }

    const res = await updateTicketStatus(id, newStatus)
    if (!res.success) {
      setTickets(oldTickets)
      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket({ ...selectedTicket, status: oldTickets.find(t => t.id === id)?.status || 'open' })
      }
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Customer Support</h1>
        <p className="text-sm text-muted mt-1">Manage and resolve user tickets and disputes.</p>
      </div>

      <div className="rounded-2xl bg-surface shadow-[var(--shadow-bento)] border border-border-subtle overflow-hidden">
        <ul className="divide-y divide-border-subtle">
          {tickets.length === 0 ? (
            <li className="p-12 text-center text-muted-foreground">No support tickets found.</li>
          ) : (
            tickets.map((ticket) => (
              <li key={ticket.id} className="p-5 hover:bg-surface transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{ticket.user}</span>
                      <span className="text-xs text-muted">· {ticket.time}</span>
                    </div>
                    <span className="text-base font-semibold text-foreground">{ticket.subject}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                      className="block w-32 px-3 py-2 text-xs font-medium border border-border rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <StatusBadge status={ticket.status} />
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary-subtle transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
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
                  <h3 className="text-lg font-heading font-semibold text-foreground">Ticket Details</h3>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 rounded-xl text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xl font-heading font-bold text-foreground">{selectedTicket.subject}</h4>
                      <StatusBadge status={selectedTicket.status} />
                    </div>
                    <p className="text-sm text-muted">
                      Reported by <span className="font-medium text-foreground">{selectedTicket.user}</span> on {selectedTicket.time}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">ID: {selectedTicket.id}</p>
                  </div>

                  <div className="bg-background p-4 rounded-xl border border-border-subtle mb-6">
                    <h5 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Description</h5>
                    <p className="text-foreground/80 whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedTicket.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end border-t border-border-subtle pt-4">
                    <label className="mr-3 text-sm font-medium text-muted">Update Status:</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                      className="block w-40 px-3 py-2 text-sm border border-border rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
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
