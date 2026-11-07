'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { createClient } from '@/utils/supabase/client'
import { requestAccountDeletion } from '@/services/account.service'

type Phase = 'loading' | 'signed-out' | 'confirm' | 'deleting' | 'done'

export default function DeleteAccountPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [confirmCheck, setConfirmCheck] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const sb = createClient()
    void sb.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (!user) {
        setPhase('signed-out')
        return
      }
      setEmail(user.email ?? null)
      setPhase('confirm')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleDelete = async () => {
    setError(null)
    if (!email) return
    if (confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
      setError('The email you typed does not match your account email.')
      return
    }
    if (!confirmCheck) {
      setError('Please acknowledge the deletion disclosure to continue.')
      return
    }

    setPhase('deleting')
    const { error: delErr } = await requestAccountDeletion()
    if (delErr) {
      setError(delErr)
      setPhase('confirm')
      return
    }

    // Sign the user out and show the success state
    const sb = createClient()
    await sb.auth.signOut().catch(() => undefined)
    setPhase('done')
  }

  return (
    <MarketingShell>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 md:py-12">
        <div className="mb-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
          </Link>
        </div>

        {phase === 'loading' && (
          <div className="py-16 flex items-center justify-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {phase === 'signed-out' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-heading font-extrabold text-slate-900">
                Delete Your CaryGoo Account
              </h1>
            </div>
            <p className="text-sm text-slate-600">
              You need to be signed in to request account deletion. Sign in to the account you want
              to delete, or email us from the registered address if you cannot access it.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href="/login?next=%2Fdelete-account"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
              >
                Sign in to continue
              </Link>
              <a
                href="mailto:support@carygoo.in?subject=Account%20Deletion%20Request"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Email support@carygoo.in
              </a>
            </div>
          </div>
        )}

        {(phase === 'confirm' || phase === 'deleting') && email && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div className="space-y-1">
                <h1 className="text-xl font-heading font-extrabold text-slate-900">
                  Delete Your CaryGoo Account
                </h1>
                <p className="text-xs text-slate-500">
                  This action is irreversible. Your profile, active listings, chat history, and
                  push tokens will be permanently erased.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
              <p className="font-extrabold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> What stays by law
              </p>
              <p>
                Under the Information Technology Act, 2000 and the Digital Personal Data Protection
                Act, 2023, we retain financial transaction identifiers and dispute-resolution logs
                for the minimum statutory period for tax, accounting, and anti-fraud purposes.
                Those records are isolated, encrypted, and never used for marketing.
              </p>
            </div>

            <div className="space-y-3">
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700">
                  Type your account email to confirm: <b>{email}</b>
                </span>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={email}
                  autoComplete="off"
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-500 transition"
                  disabled={phase === 'deleting'}
                />
              </label>

              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={confirmCheck}
                  onChange={(e) => setConfirmCheck(e.target.checked)}
                  disabled={phase === 'deleting'}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>
                  I understand my account, listings, messages, and KYC submissions will be permanently
                  deleted and cannot be restored.
                </span>
              </label>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => router.push('/profile')}
                disabled={phase === 'deleting'}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={
                  phase === 'deleting' ||
                  !confirmCheck ||
                  confirmEmail.trim().toLowerCase() !== email.toLowerCase()
                }
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {phase === 'deleting' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Permanently delete my account
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-heading font-extrabold text-slate-900">
              Account deleted
            </h1>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Your profile has been permanently removed from CaryGoo. If you change your mind, you
              can sign up again with the same email — a fresh account will be created.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
              >
                Return home
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 text-[11px] text-slate-500 text-center">
          Having trouble? Email{' '}
          <a href="mailto:support@carygoo.in" className="font-semibold text-slate-700 underline">
            support@carygoo.in
          </a>{' '}
          — our security team processes verified requests within 48 to 72 hours.
        </div>
      </div>
    </MarketingShell>
  )
}
