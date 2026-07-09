'use client'

import { useState } from 'react'
import { MessageSquare, CheckCircle, Clock, Eye, X } from 'lucide-react'
import { updateTicketStatus } from './actions'

type TicketRow = {
  id: string
  user: string
  subject: string
  description?: string
  status: string
  time: string
}

export default function SupportTable({ initialTickets }: { initialTickets: TicketRow[] }) {
  const [tickets, setTickets] = useState(initialTickets)
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null)

  const handleStatusChange = async (id: string, newStatus: string) => {
    // Optimistic UI update
    const oldTickets = [...tickets]
    setTickets(tickets.map((t) => (t.id === id ? { ...t, status: newStatus } : t)))

    if (selectedTicket && selectedTicket.id === id) {
      setSelectedTicket({ ...selectedTicket, status: newStatus })
    }

    const res = await updateTicketStatus(id, newStatus)
    if (!res.success) {
      // Revert on failure
      setTickets(oldTickets)
      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket({ ...selectedTicket, status: oldTickets.find(t => t.id === id)?.status || 'open' })
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 items-center">
            <Clock className="w-4 h-4 mr-1" /> Open
          </span>
        )
      case 'in_progress':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 items-center">
            <MessageSquare className="w-4 h-4 mr-1" /> In Progress
          </span>
        )
      case 'resolved':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 items-center">
            <CheckCircle className="w-4 h-4 mr-1" /> Resolved
          </span>
        )
      default:
        return null
    }
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Support</h1>
        <p className="text-gray-500">Manage and resolve user tickets and disputes.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {tickets.length === 0 ? (
            <li className="p-6 text-center text-gray-500">No support tickets found.</li>
          ) : (
            tickets.map((ticket) => (
              <li key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="text-sm font-medium text-gray-900">{ticket.user}</span>
                      <span className="text-sm text-gray-500">• {ticket.id}</span>
                      <span className="text-sm text-gray-400">• {ticket.time}</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-800">{ticket.subject}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                      className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <div>{getStatusBadge(ticket.status)}</div>
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Ticket Viewer Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Ticket Details</h3>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xl font-bold text-gray-900">{selectedTicket.subject}</h4>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <p className="text-sm text-gray-500">Reported by <span className="font-medium text-gray-900">{selectedTicket.user}</span> on {selectedTicket.time}</p>
                <p className="text-xs text-gray-400 font-mono mt-1">ID: {selectedTicket.id}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6">
                <h5 className="text-sm font-semibold text-gray-700 mb-2">Description</h5>
                <p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedTicket.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-end border-t border-gray-100 pt-4 mt-6">
                <label className="mr-3 text-sm font-medium text-gray-700">Update Status:</label>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                  className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
