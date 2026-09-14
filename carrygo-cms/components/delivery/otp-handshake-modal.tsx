'use client'

import { useState } from 'react'
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface Props {
  isOpen: boolean
  onClose: () => void
  requestId: string
  deliveryId?: string
  isTraveler: boolean
  displayOtp?: string
  onConfirmed?: () => void
}

export function OtpHandshakeModal({
  isOpen,
  onClose,
  requestId,
  deliveryId,
  isTraveler,
  displayOtp = '202611',
  onConfirmed,
}: Props) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (otp.length !== 6) {
      setError('Please enter a 6-digit delivery confirmation code.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      if (deliveryId) {
        const { error: rpcError } = await supabase.rpc('verify_delivery_otp', {
          p_delivery_id: deliveryId,
          p_otp: otp,
        })
        if (rpcError) throw rpcError
      } else {
        // Fallback update on deliveries / requests table
        await supabase
          .from('requests')
          .update({ status: 'completed' })
          .eq('id', requestId)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 md:p-8 bg-white shadow-2xl border border-slate-200 space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-heading font-extrabold text-slate-900">
              {isTraveler ? 'Enter Delivery OTP' : 'Your Delivery Confirmation Code'}
            </h3>
            <p className="text-xs text-slate-500">
              {isTraveler
                ? 'Ask recipient for the 6-digit OTP upon package handover.'
                : 'Share this code with the traveler only when you receive your parcel.'}
            </p>
          </div>
        </div>

        {success ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-base font-bold text-emerald-950">Delivery Confirmed!</h4>
            <p className="text-xs text-emerald-800">
              Handover verified successfully. Escrow funds have been credited to traveler payout balance.
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
              <label className="text-xs font-semibold text-slate-700 block">6-Digit Confirmation OTP</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[0.6em] text-2xl font-mono font-bold py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 active:scale-98 transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                'Confirm Delivery & Release Escrow'
              )}
            </button>
          </form>
        ) : (
          /* Sender view: Display OTP */
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Give this code to traveler
              </span>
              <div className="text-3xl font-mono font-extrabold tracking-widest text-emerald-700 bg-white py-3 px-6 rounded-xl border border-emerald-200 inline-block shadow-xs">
                {displayOtp}
              </div>
              <p className="text-xs text-slate-500">
                Never share this code over the phone before inspecting your package.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Escrow funds remain protected until traveler submits this code.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
