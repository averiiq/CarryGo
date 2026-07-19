'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Download, ArrowUpDown, IndianRupee, TrendingUp, Lock, RefreshCcw } from 'lucide-react'

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
  locked: { label: 'Locked', color: 'bg-warning-subtle text-warning border-warning/15', icon: Lock },
  released: { label: 'Released', color: 'bg-success-subtle text-success border-success/15', icon: TrendingUp },
  refunded: { label: 'Refunded', color: 'bg-danger-subtle text-danger border-danger/15', icon: RefreshCcw },
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
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <p className="text-[11px] text-muted uppercase tracking-wider font-medium">Released</p>
          </div>
          <p className="text-2xl font-heading font-bold text-success">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-3.5 h-3.5 text-warning" />
            <p className="text-[11px] text-muted uppercase tracking-wider font-medium">Locked</p>
          </div>
          <p className="text-2xl font-heading font-bold text-warning">₹{totalLocked.toLocaleString('en-IN')}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCcw className="w-3.5 h-3.5 text-danger" />
            <p className="text-[11px] text-muted uppercase tracking-wider font-medium">Refunded</p>
          </div>
          <p className="text-2xl font-heading font-bold text-danger">₹{totalRefunded.toLocaleString('en-IN')}</p>
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
            className="w-full pl-9 pr-4 py-2.5 rounded-xl glass border border-border text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border text-sm bg-surface-solid text-foreground focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="all">All Status</option>
            <option value="locked">Locked</option>
            <option value="released">Released</option>
            <option value="refunded">Refunded</option>
          </select>
          <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-sm text-muted hover:text-foreground hover:border-border-strong transition-all">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Sender</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Traveller</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('amount')}>
                  <span className="flex items-center gap-1">Amount <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Gateway ID</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('date')}>
                  <span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <IndianRupee className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No payments found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((payment, i) => {
                  const config = statusConfig[payment.status]
                  const StatusIcon = config.icon
                  return (
                    <motion.tr
                      key={payment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-surface-elevated/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-foreground text-xs">{payment.sender_name || 'Unknown'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-foreground text-xs">{payment.traveller_name || 'Unknown'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-foreground tabular-nums">₹{payment.amount.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${config.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {payment.razorpay_order_id ? (
                          <span className="text-[11px] font-mono text-muted bg-background px-2 py-0.5 rounded-md border border-border-subtle">
                            {payment.razorpay_order_id.slice(0, 18)}…
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-muted">
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

      <p className="text-[11px] text-muted-foreground text-right">
        Showing {filtered.length} of {payments.length} payments
      </p>
    </div>
  )
}
