'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BellOff,
  Loader2,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { createClient } from '@/utils/supabase/client'
import {
  createSubscription,
  deleteSubscription,
  fetchSubscriptions,
  toggleSubscription,
  type RouteSubscription,
} from '@/services/subscriptions.service'

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<RouteSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [fromCity, setFromCity] = useState('')
  const [toCity, setToCity] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async (uid: string) => {
    setLoading(true)
    const result = await fetchSubscriptions(uid)
    setLoading(false)
    if (result.data) setSubs(result.data)
  }

  useEffect(() => {
    const sb = createClient()
    void sb.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        void refresh(user.id)
      } else {
        setLoading(false)
      }
    })
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCreating(true)
    const result = await createSubscription(fromCity, toCity)
    setCreating(false)
    if (!result.data) {
      setError(result.error ?? 'Could not save alert.')
      return
    }
    setFromCity('')
    setToCity('')
    if (userId) void refresh(userId)
  }

  const handleToggle = async (sub: RouteSubscription) => {
    setSubs((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, active: !s.active } : s)),
    )
    const { error: upErr } = await toggleSubscription(sub.id, !sub.active)
    if (upErr) {
      // revert
      setSubs((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, active: sub.active } : s)),
      )
      setError(upErr)
    }
  }

  const handleDelete = async (sub: RouteSubscription) => {
    setSubs((prev) => prev.filter((s) => s.id !== sub.id))
    const { error: delErr } = await deleteSubscription(sub.id)
    if (delErr && userId) {
      setError(delErr)
      void refresh(userId)
    }
  }

  if (!userId && !loading) {
    return (
      <MarketingShell>
        <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-heading font-extrabold text-slate-900">
            Save a route — get an alert the moment a match appears
          </h1>
          <p className="text-xs text-slate-500">
            Sign in to set up corridor alerts.
          </p>
          <Link
            href="/login?next=%2Fsubscriptions"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
          >
            Sign in
          </Link>
        </div>
      </MarketingShell>
    )
  }

  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
        <div className="mb-4">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-heading font-extrabold text-slate-900">
                Route alerts
              </h1>
              <p className="text-xs text-slate-500">
                We'll notify you when a trip or parcel is posted on a saved corridor.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <input
              type="text"
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              placeholder="From city"
              maxLength={100}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 transition"
            />
            <input
              type="text"
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              placeholder="To city"
              maxLength={100}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 transition"
            />
            <button
              type="submit"
              disabled={creating || !fromCity.trim() || !toCity.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
            >
              {creating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Save alert
            </button>
          </form>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-10 flex items-center justify-center text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : subs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <BellOff className="w-6 h-6 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No saved routes yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Add a city-pair above to get notified when matches appear.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {subs.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200"
                >
                  <span className="shrink-0 w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <span className="truncate">{sub.fromCity}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{sub.toCity}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleToggle(sub)}
                    className={`shrink-0 relative inline-block w-10 h-6 rounded-full transition ${
                      sub.active ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                    aria-label={sub.active ? 'Disable alert' : 'Enable alert'}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        sub.active ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(sub)}
                    className="shrink-0 w-9 h-9 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center"
                    aria-label="Delete alert"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </MarketingShell>
  )
}
