'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, Download, ExternalLink, ArrowUpDown, IndianRupee } from 'lucide-react'

interface Payment {
  id: string
  sender_name: string
  traveller_name: string
  amount: number
  status: 'locked' | 'released' | 'refunded'
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  locked_at: string
  released_at: string | null
  request_id: string
}

interface PaymentsTableProps {
  payments: Payment[]
  totalRevenue: number
  totalLocked: number
  totalRefunded: number
}

const statusConfig = {
  locked: { label: 'Locked', color: 'bg-warning/10 text-warning border-warning/20' },
  released: { label: 'Released', color: 'bg-success/10 text-success border-success/20' },
  refunded: { label: 'Refunded', color: 'bg-danger/10 text-danger border-danger/20' },
}

export default function PaymentsTable({ payments, totalRevenue, totalLocked, totalRefunded }: PaymentsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtered = payments
    .filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          p.sender_name?.toLowerCase().includes(q) ||
          p.traveller_name?.toLowerCase().includes(q) ||
          p.razorpay_order_id?.toLowerCase().includes(q) ||
          p.razorpay_payment_id?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'amount') return sortDir === 'desc' ? b.amount - a.amount : a.amount - b.amount
      const dateA = new Date(a.locked_at).getTime()
      const dateB = new Date(b.locked_at).getTime()
      return sortDir === 'desc' ? dateB - dateA : dateA - dateB
    })

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-surface border border-border-subtle p-4 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Released</p>
          <p className="text-xl font-heading font-bold text-success mt-1">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-surface border border-border-subtle p-4 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Currently Locked</p>
          <p className="text-xl font-heading font-bold text-warning mt-1">₹{totalLocked.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-surface border border-border-subtle p-4 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Refunded</p>
          <p className="text-xl font-heading font-bold text-danger mt-1">₹{totalRefunded.toLocaleString()}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, order ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Status</option>
            <option value="locked">Locked</option>
            <option value="released">Released</option>
            <option value="refunded">Refunded</option>
          </select>
          <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-surface border border-border-subtle shadow-[var(--shadow-bento)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-slate-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sender</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Traveller</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                  <span className="flex items-center gap-1">Amount <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gateway ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <IndianRupee className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">No payments found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((payment, i) => {
                  const config = statusConfig[payment.status]
                  return (
                    <motion.tr
                      key={payment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-foreground">{payment.sender_name || 'Unknown'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-foreground">{payment.traveller_name || 'Unknown'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-foreground tabular-nums">₹{payment.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${config.color}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {payment.razorpay_order_id ? (
                          <span className="text-xs font-mono text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">
                            {payment.razorpay_order_id.slice(0, 20)}...
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-muted-foreground">
                          {new Date(payment.locked_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-right">Showing {filtered.length} of {payments.length} payments</p>
    </div>
  )
}
