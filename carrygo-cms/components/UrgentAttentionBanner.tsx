'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  FileCheck,
  CreditCard,
  HeadphonesIcon,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

interface UrgentAttentionProps {
  pendingKyc: number
  staleEscrows: number
  openDisputes: number
  openTickets: number
  activeBanners: number
  totalLockedEscrow: number
}

export default function UrgentAttentionBanner({
  pendingKyc,
  staleEscrows,
  openDisputes,
  openTickets,
  activeBanners,
  totalLockedEscrow,
}: UrgentAttentionProps) {
  const hasUrgentItems = pendingKyc > 0 || staleEscrows > 0 || openDisputes > 0 || openTickets > 0

  if (!hasUrgentItems) {
    return (
      <div className="glass-card p-4 rounded-2xl border-success/30 bg-success/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-success-subtle text-success shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              All Systems Operational & Queues Clear
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">
                Healthy
              </span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              No stale escrow balances, pending identity verifications, or open disputes require intervention.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/payments"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            Escrow: ₹{totalLockedEscrow.toLocaleString('en-IN')}
          </Link>
          <Link
            href="/dashboard/banners"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary-subtle text-primary hover:bg-primary/20 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {activeBanners} Live Banner{activeBanners === 1 ? '' : 's'}
          </Link>
        </div>
      </div>
    )
  }

  const alertItems = [
    ...(staleEscrows > 0
      ? [
          {
            title: `${staleEscrows} Stale Escrow${staleEscrows > 1 ? 's' : ''}`,
            desc: '>48h awaiting delivery or admin arbitration',
            href: '/dashboard/payments',
            icon: CreditCard,
            color: 'text-warning',
            bg: 'bg-warning-subtle',
            border: 'border-warning/30',
            buttonLabel: 'Resolve Escrow',
          },
        ]
      : []),
    ...(pendingKyc > 0
      ? [
          {
            title: `${pendingKyc} Pending KYC Document${pendingKyc > 1 ? 's' : ''}`,
            desc: 'Awaiting operator identity verification',
            href: '/dashboard/kyc?status=submitted',
            icon: FileCheck,
            color: 'text-primary',
            bg: 'bg-primary-subtle',
            border: 'border-primary/30',
            buttonLabel: 'Verify ID',
          },
        ]
      : []),
    ...(openDisputes > 0
      ? [
          {
            title: `${openDisputes} Open Dispute${openDisputes > 1 ? 's' : ''}`,
            desc: 'Reported transit failure or mismatch',
            href: '/dashboard/disputes',
            icon: AlertTriangle,
            color: 'text-danger',
            bg: 'bg-danger-subtle',
            border: 'border-danger/30',
            buttonLabel: 'Arbitrate',
          },
        ]
      : []),
    ...(openTickets > 0
      ? [
          {
            title: `${openTickets} Support Ticket${openTickets > 1 ? 's' : ''}`,
            desc: 'Customer inquiry awaiting response',
            href: '/dashboard/support?status=open',
            icon: HeadphonesIcon,
            color: 'text-cyan-600 dark:text-cyan-400',
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/30',
            buttonLabel: 'Reply',
          },
        ]
      : []),
  ]

  return (
    <div className="glass-card p-5 rounded-2xl border-warning/30 bg-gradient-to-br from-warning/5 via-surface to-surface space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-warning/20 text-warning shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
              Action Required: Operational Attention Queue
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30">
                {alertItems.length} Queue{alertItems.length > 1 ? 's' : ''} Pending
              </span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Items requiring immediate administrator intervention to maintain trust and service SLAs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/banners"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface border border-border text-muted hover:text-foreground transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {activeBanners} Live Banner{activeBanners === 1 ? '' : 's'}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {alertItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.title}
              href={item.href}
              className={`p-3.5 rounded-xl border ${item.border} ${item.bg} hover:brightness-105 transition-all group flex flex-col justify-between`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-xs font-bold text-foreground">{item.title}</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted leading-tight">{item.desc}</p>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold pt-3 mt-1 border-t border-border-subtle/40">
                <span className={item.color}>{item.buttonLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
