'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  LifeBuoy,
  Loader2,
  Send,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import {
  createSupportTicket,
  getUserSupportTickets,
  SUPPORT_CATEGORIES,
  type SupportTicket,
  type SupportTicketCategory,
} from '@/services/support.service'

const CATEGORY_KEYS = Object.keys(SUPPORT_CATEGORIES) as SupportTicketCategory[]

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<SupportTicketCategory>('general')

  const refresh = async () => {
    setLoading(true)
    const result = await getUserSupportTickets()
    setLoading(false)
    if (result.data) setTickets(result.data)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    const result = await createSupportTicket({ subject, description, category })
    setSubmitting(false)
    if (!result.data) {
      setError(result.error ?? 'Could not submit ticket.')
      return
    }
    setSubject('')
    setDescription('')
    setCategory('general')
    setSuccess('Ticket submitted — our team will reply via email within 24 hours.')
    void refresh()
  }

  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
        <div className="mb-4">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-heading font-extrabold text-slate-900">Support</h1>
              <p className="text-xs text-slate-500">
                Open a ticket. Our ops team replies within 24 hours (critical issues within 2 hours).
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Category</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {CATEGORY_KEYS.map((key) => {
                  const active = category === key
                  const def = SUPPORT_CATEGORIES[key]
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition ${
                        active
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <p
                        className={`font-bold ${active ? 'text-emerald-800' : 'text-slate-900'}`}
                      >
                        {def.label}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{def.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary of the issue"
                maxLength={160}
                required
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Describe the issue</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened, what you expected, and any order or delivery IDs we can look up."
                rows={5}
                maxLength={2000}
                required
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 transition resize-none"
              />
              <p className="text-[11px] text-slate-500 text-right">{description.length}/2000</p>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {success}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !subject.trim() || description.trim().length < 10}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Submit ticket
            </button>
          </form>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-4">
          <h2 className="text-base font-heading font-extrabold text-slate-900">Your recent tickets</h2>

          {loading ? (
            <div className="py-6 flex items-center justify-center text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-xs text-slate-500">You haven't opened any tickets yet.</p>
          ) : (
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200"
                >
                  <span
                    className={`shrink-0 mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      t.status === 'resolved' || t.status === 'closed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <Clock className="w-3 h-3" /> {t.status}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{t.subject}</p>
                    <p className="text-xs text-slate-600 line-clamp-2">{t.description}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {new Date(t.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </MarketingShell>
  )
}
