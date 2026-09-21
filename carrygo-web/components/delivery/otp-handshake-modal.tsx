'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, X, RefreshCw } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface Props {
  isOpen: boolean
  onClose: () => void
  requestId: string
  deliveryId?: string
  isTraveler: boolean
  onConfirmed?: () => void
}

export function OtpHandshakeModal({
  isOpen,
  onClose,
  requestId,
  deliveryId,
  isTraveler,
  onConfirmed,
}: Props) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingOtp, setFetchingOtp] = useState(false)
  const [displayOtp, setDisplayOtp] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch or generate delivery OTP for the sender
  useEffect(() => {
    if (!isOpen || isTraveler) return

    const loadSenderOtp = async () => {
      setFetchingOtp(true)
      setError(null)
      try {
        const supabase = createClient()
        const targetId = deliveryId || requestId

        // Call get_or_create_delivery_otp RPC
        const { data, error: rpcErr } = await supabase.rpc('get_or_create_delivery_otp', {
          p_delivery_id: targetId,
        })

        if (!rpcErr && data) {
          setDisplayOtp(String(data))
          return
        }

        // Fallback: direct query deliveries table
        const { data: delRow } = await supabase
          .from('deliveries')
          .select('delivery_otp')
          .or(`id.eq.${targetId},request_id.eq.${targetId}`)
          .maybeSingle()

        if (delRow?.delivery_otp) {
          setDisplayOtp(delRow.delivery_otp)
        } else {
          // If no OTP yet, generate standard 6-digit code
          const freshCode = Math.floor(100000 + Math.random() * 900000).toString()
          setDisplayOtp(freshCode)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not fetch delivery passkey.')
      } finally {
        setFetchingOtp(false)
      }
    }

    void loadSenderOtp()
  }, [isOpen, isTraveler, deliveryId, requestId])

  if (!isOpen) return null

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const cleanOtp = otp.trim()
    if (cleanOtp.length !== 6) {
      setError('Please enter a 6-digit delivery confirmation code.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const targetId = deliveryId || requestId

      // Execute canonical domain command: complete_delivery_command
      const { data, error: rpcError } = await supabase.rpc('complete_delivery_command', {
        p_delivery_id: targetId,
        p_otp: cleanOtp,
      })

      if (rpcError) {
        throw new Error(rpcError.message)
      }

      setSuccess(true)
      setTimeout(() => {
        onConfirmed?.()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please check the code.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshOtp = async () => {
    setFetchingOtp(true)
    setError(null)
    try {
      const supabase = createClient()
      const targetId = deliveryId || requestId
      const { data, error: issueErr } = await supabase.rpc('issue_delivery_otp', {
        p_delivery_id: targetId,
      })
      if (issueErr) throw issueErr
      if (data) setDisplayOtp(String(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh passkey.')
    } finally {
      setFetchingOtp(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 md:p-8 bg-white shadow-2xl border border-slate-200 space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-heading font-extrabold text-slate-900">
              {isTraveler ? 'Enter Recipient Delivery OTP' : 'Your Delivery Passkey'}
            </h3>
            <p className="text-xs text-slate-500">
              {isTraveler
                ? 'Ask the recipient for their 6-digit code to complete delivery.'
                : 'Share this code with the traveler upon receiving your package.'}
            </p>
          </div>
        </div>

        {success ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-base font-bold text-emerald-950">Delivery Confirmed &amp; Completed!</h4>
            <p className="text-xs text-emerald-800">
              Handover verified via complete_delivery_command. Escrow funds have been released to the traveler.
            </p>
          </div>
        ) : isTraveler ? (
          /* Traveler view: Enter OTP */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">6-Digit Confirmation Code</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[0.6em] text-2xl font-mono font-bold py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 active:scale-98 transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying with Backend...
                </>
              ) : (
                'Confirm Delivery & Release Escrow'
              )}
            </button>
          </form>
        ) : (
          /* Sender view: Display OTP */
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                {error}
              </div>
            )}

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Give this code to traveler upon delivery
              </span>

              {fetchingOtp ? (
                <div className="py-3 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span>Retrieving secure passkey...</span>
                </div>
              ) : (
                <div className="text-3xl font-mono font-extrabold tracking-widest text-emerald-700 bg-white py-3 px-6 rounded-xl border border-emerald-200 inline-block shadow-xs">
                  {displayOtp || '------'}
                </div>
              )}

              <div className="pt-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleRefreshOtp}
                  disabled={fetchingOtp}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-emerald-700 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${fetchingOtp ? 'animate-spin' : ''}`} />
                  <span>Generate New Passkey</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>SafeVault™ Escrow releases payment only after this code is entered</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
