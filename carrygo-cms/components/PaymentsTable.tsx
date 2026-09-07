'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Download,
  ArrowUpDown,
  IndianRupee,
  TrendingUp,
  Lock,
  RefreshCcw,
  Eye,
  AlertTriangle,
  User,
  Route,
  Package,
  Clock,
  ShieldCheck,
  Check,
  Copy,
  Loader2,
} from 'lucide-react'
import SlideOver from '@/components/SlideOver'
import { adminReleasePayment, adminRefundPayment } from '@/app/dashboard/payments/actions'

export interface EnrichedPayment {
  id: string
  sender_name: string
  sender_email: string | null
  sender_phone: string | null
  traveller_name: string
  traveller_email: string | null
  traveller_phone: string | null
  amount: number
  status: 'locked' | 'released' | 'refunded'
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  locked_at: string
  released_at: string | null
  request_id: string
  route?: string | null
  parcel_description?: string | null
  parcel_category?: string | null
  parcel_weight?: number | null
  request_status?: string | null
}

interface PaymentsTableProps {
  payments: EnrichedPayment[]
  totalRevenue: number
  totalLocked: number
  totalRefunded: number
}

const statusConfig = {
  locked: { label: 'Locked in Escrow', color: 'bg-warning-subtle text-warning border-warning/20', icon: Lock },
  released: { label: 'Released to Traveller', color: 'bg-success-subtle text-success border-success/20', icon: TrendingUp },
  refunded: { label: 'Refunded to Sender', color: 'bg-danger-subtle text-danger border-danger/20', icon: RefreshCcw },
}

function isStaleEscrow(payment: EnrichedPayment): boolean {
  if (payment.status !== 'locked') return false
  const lockTime = new Date(payment.locked_at).getTime()
  const now = Date.now()
  const hoursLocked = (now - lockTime) / (1000 * 60 * 60)
  return hoursLocked >= 48
}

export default function PaymentsTable({
  payments,
  totalRevenue,
  totalLocked,
  totalRefunded,
}: PaymentsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'locked' | 'released' | 'refunded'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedPayment, setSelectedPayment] = useState<EnrichedPayment | null>(null)

  // Escrow actions state
  const [isPending, startTransition] = useTransition()
  const [refundReason, setRefundReason] = useState('')
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRelease = (paymentId: string) => {
    setActionError(null)
    setActionSuccess(null)
    startTransition(async () => {
      const res = await adminReleasePayment(paymentId)
      if (res.success) {
        setActionSuccess('Payment released to traveller successfully.')
        setSelectedPayment((prev) => (prev && prev.id === paymentId ? { ...prev, status: 'released', released_at: new Date().toISOString() } : prev))
      } else {
        setActionError(res.error)
      }
    })
  }

  const handleRefund = (paymentId: string) => {
    setActionError(null)
    setActionSuccess(null)
    startTransition(async () => {
      const res = await adminRefundPayment(paymentId, refundReason)
      if (res.success) {
        setActionSuccess('Payment refunded to sender successfully.')
        setShowRefundForm(false)
        setRefundReason('')
        setSelectedPayment((prev) => (prev && prev.id === paymentId ? { ...prev, status: 'refunded' } : prev))
      } else {
        setActionError(res.error)
      }
    })
  }

  const filtered = payments
    .filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          p.sender_name?.toLowerCase().includes(q) ||
          p.traveller_name?.toLowerCase().includes(q) ||
          p.razorpay_order_id?.toLowerCase().includes(q) ||
          p.razorpay_payment_id?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.route?.toLowerCase().includes(q) ||
          p.parcel_description?.toLowerCase().includes(q)
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
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const exportPayments = () => {
    const escapeCell = (value: unknown) => {
      let text = String(value ?? '')
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
      return `"${text.replace(/"/g, '""')}"`
    }
    const rows = [
      ['ID', 'Sender', 'Traveller', 'Amount', 'Status', 'Gateway Order ID', 'Gateway Payment ID', 'Route', 'Date'],
      ...filtered.map((payment) => [
        payment.id,
        payment.sender_name,
        payment.traveller_name,
        payment.amount,
        payment.status,
        payment.razorpay_order_id || '',
        payment.razorpay_payment_id || '',
        payment.route || '',
        payment.locked_at,
      ]),
    ]
    const blob = new Blob([rows.map((row) => row.map(escapeCell).join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const staleEscrowCount = payments.filter(isStaleEscrow).length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Total Released</p>
          </div>
          <p className="text-2xl font-heading font-bold text-success">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted mt-1">Paid out to travellers</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-warning" />
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">In Escrow</p>
          </div>
          <p className="text-2xl font-heading font-bold text-warning">₹{totalLocked.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted mt-1">Awaiting delivery OTP</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCcw className="w-4 h-4 text-danger" />
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Refunded</p>
          </div>
          <p className="text-2xl font-heading font-bold text-danger">₹{totalRefunded.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted mt-1">Returned to senders</p>
        </div>

        <div className={`glass-card p-4 ${staleEscrowCount > 0 ? 'border-warning/40 bg-warning/5' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${staleEscrowCount > 0 ? 'text-warning' : 'text-muted'}`} />
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Stale Escrow (&gt;48h)</p>
          </div>
          <p className={`text-2xl font-heading font-bold ${staleEscrowCount > 0 ? 'text-warning' : 'text-foreground'}`}>
            {staleEscrowCount}
          </p>
          <p className="text-xs text-muted mt-1">Requires admin review</p>
        </div>
      </div>

      {/* Status Filter Tabs & Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-surface border border-border">
          {(['all', 'locked', 'released', 'refunded'] as const).map((tab) => {
            const count = tab === 'all' ? payments.length : payments.filter((p) => p.status === tab).length
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
                  statusFilter === tab
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted hover:text-foreground hover:bg-surface-elevated'
                }`}
              >
                {tab === 'all' ? 'All Payments' : tab}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${statusFilter === tab ? 'bg-white/20 text-white' : 'bg-surface-elevated text-muted'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, ID, route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search payments"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={exportPayments}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted hover:text-foreground hover:border-border-strong transition-all shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted uppercase tracking-wider">Sender</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted uppercase tracking-wider">Traveller</th>
                <th
                  className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => toggleSort('amount')}
                >
                  <span className="flex items-center gap-1">
                    Amount <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted uppercase tracking-wider">Route / Context</th>
                <th
                  className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => toggleSort('date')}
                >
                  <span className="flex items-center gap-1">
                    Date <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <IndianRupee className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No payments match your criteria</p>
                  </td>
                </tr>
              ) : (
                filtered.map((payment, i) => {
                  const config = statusConfig[payment.status]
                  const StatusIcon = config.icon
                  const isStale = isStaleEscrow(payment)

                  return (
                    <motion.tr
                      key={payment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.015 }}
                      onClick={() => setSelectedPayment(payment)}
                      className="hover:bg-surface-elevated/60 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-foreground text-xs">{payment.sender_name}</div>
                        {payment.sender_phone && <div className="text-[11px] text-muted">{payment.sender_phone}</div>}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-medium text-foreground text-xs">{payment.traveller_name}</div>
                        {payment.traveller_phone && <div className="text-[11px] text-muted">{payment.traveller_phone}</div>}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-bold text-foreground tabular-nums text-sm">
                          ₹{payment.amount.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${config.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
                          {isStale && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-warning/15 text-warning border border-warning/30">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              &gt;48h Pending
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {payment.route ? (
                          <div className="text-xs font-medium text-foreground">{payment.route}</div>
                        ) : (
                          <div className="text-xs text-muted-foreground">General Delivery</div>
                        )}
                        {payment.parcel_description && (
                          <div className="text-[11px] text-muted truncate max-w-[160px]">
                            {payment.parcel_description}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-xs text-muted">
                          {new Date(payment.locked_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPayment(payment)
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-primary bg-primary-subtle rounded-lg hover:bg-primary/15 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>
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

      {/* Payment Details & Escrow Actions Drawer */}
      <SlideOver
        open={Boolean(selectedPayment)}
        onClose={() => {
          setSelectedPayment(null)
          setShowRefundForm(false)
          setActionError(null)
          setActionSuccess(null)
        }}
        title="Payment & Escrow Details"
        subtitle={selectedPayment ? `ID: ${selectedPayment.id}` : undefined}
        width="md"
      >
        {selectedPayment && (
          <div className="space-y-6 text-sm">
            {actionSuccess && (
              <div className="p-3 rounded-xl bg-success-subtle border border-success/20 text-success text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                {actionSuccess}
              </div>
            )}

            {actionError && (
              <div className="p-3 rounded-xl bg-danger-subtle border border-danger/20 text-danger text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {actionError}
              </div>
            )}

            {/* Escrow Status & Amount Card */}
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold">Total Escrow Amount</p>
                  <p className="text-3xl font-heading font-bold text-foreground mt-0.5">
                    ₹{selectedPayment.amount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${statusConfig[selectedPayment.status].color}`}>
                    {statusConfig[selectedPayment.status].label}
                  </span>
                </div>
              </div>

              {isStaleEscrow(selectedPayment) && (
                <div className="p-3 rounded-xl bg-warning-subtle border border-warning/20 text-warning text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Action Required:</strong> This payment has been locked for over 48 hours without completion. Contact the traveller or release/refund as appropriate.
                  </div>
                </div>
              )}
            </div>

            {/* Admin Actions (When Locked) */}
            {selectedPayment.status === 'locked' && (
              <div className="glass-card p-5 rounded-2xl space-y-4 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Admin Intervention</h4>
                </div>

                <p className="text-xs text-muted">
                  You can manually release these funds to the traveller if the parcel was verified delivered, or refund them back to the sender if delivery failed.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRelease(selectedPayment.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-success text-white text-xs font-semibold hover:bg-success/90 transition-all disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    Release to Traveller
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setShowRefundForm(!showRefundForm)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-danger text-white text-xs font-semibold hover:bg-danger/90 transition-all disabled:opacity-50"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Refund to Sender
                  </button>
                </div>

                {showRefundForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-2 border-t border-border-subtle"
                  >
                    <label className="text-xs font-medium text-foreground block">
                      Refund Reason (Stored in Audit Log & Request Note)
                    </label>
                    <textarea
                      rows={2}
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="e.g. Traveller did not show up at pickup location."
                      className="w-full p-2.5 rounded-xl border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-danger/20"
                    />
                    <button
                      type="button"
                      disabled={isPending || !refundReason.trim()}
                      onClick={() => handleRefund(selectedPayment.id)}
                      className="w-full py-2 px-3 rounded-xl bg-danger text-white text-xs font-semibold hover:bg-danger/90 transition-all disabled:opacity-50"
                    >
                      {isPending ? 'Processing Refund...' : 'Confirm Refund to Sender'}
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {/* Participants Information */}
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Transaction Parties</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted font-medium flex items-center gap-1">
                    <User className="w-3 h-3 text-primary" /> Sender (Payer)
                  </p>
                  <p className="text-xs font-semibold text-foreground">{selectedPayment.sender_name}</p>
                  {selectedPayment.sender_email && <p className="text-[11px] text-muted">{selectedPayment.sender_email}</p>}
                  {selectedPayment.sender_phone && <p className="text-[11px] text-muted">{selectedPayment.sender_phone}</p>}
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-muted font-medium flex items-center gap-1">
                    <User className="w-3 h-3 text-success" /> Traveller (Payee)
                  </p>
                  <p className="text-xs font-semibold text-foreground">{selectedPayment.traveller_name}</p>
                  {selectedPayment.traveller_email && <p className="text-[11px] text-muted">{selectedPayment.traveller_email}</p>}
                  {selectedPayment.traveller_phone && <p className="text-[11px] text-muted">{selectedPayment.traveller_phone}</p>}
                </div>
              </div>
            </div>

            {/* Route & Delivery Request Context */}
            <div className="glass-card p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Delivery Context</h4>
              {selectedPayment.route && (
                <div className="flex items-center gap-2 text-xs">
                  <Route className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-semibold text-foreground">{selectedPayment.route}</span>
                </div>
              )}

              {selectedPayment.parcel_description && (
                <div className="flex items-start gap-2 text-xs">
                  <Package className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                  <div>
                    <span className="text-foreground font-medium">{selectedPayment.parcel_description}</span>
                    {selectedPayment.parcel_category && (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-surface-elevated text-muted capitalize">
                        {selectedPayment.parcel_category}
                      </span>
                    )}
                    {selectedPayment.parcel_weight && (
                      <span className="ml-1 text-[10px] text-muted">
                        ({selectedPayment.parcel_weight} kg)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedPayment.request_id && (
                <div className="text-[11px] text-muted pt-2 border-t border-border-subtle flex items-center justify-between">
                  <span>Linked Request:</span>
                  <span className="font-mono text-foreground font-medium">#{selectedPayment.request_id.slice(0, 8)}</span>
                </div>
              )}
            </div>

            {/* Gateway & Technical Trail */}
            <div className="glass-card p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Gateway & Timestamps</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border-subtle">
                  <span className="text-muted">Razorpay Order ID:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-medium text-foreground">
                      {selectedPayment.razorpay_order_id || '—'}
                    </span>
                    {selectedPayment.razorpay_order_id && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedPayment.razorpay_order_id!, 'order')}
                        className="text-muted hover:text-foreground"
                      >
                        {copiedId === 'order' ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border-subtle">
                  <span className="text-muted">Razorpay Payment ID:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-medium text-foreground">
                      {selectedPayment.razorpay_payment_id || '—'}
                    </span>
                    {selectedPayment.razorpay_payment_id && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedPayment.razorpay_payment_id!, 'pay')}
                        className="text-muted hover:text-foreground"
                      >
                        {copiedId === 'pay' ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border-subtle">
                  <span className="text-muted">Escrow Locked:</span>
                  <span className="text-foreground">{new Date(selectedPayment.locked_at).toLocaleString()}</span>
                </div>

                {selectedPayment.released_at && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted">Escrow Released:</span>
                    <span className="text-foreground">{new Date(selectedPayment.released_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  )
}
