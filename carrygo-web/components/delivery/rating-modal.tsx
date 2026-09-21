'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Star, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface Props {
  isOpen: boolean
  onClose: () => void
  requestId: string
  toUserId: string
  targetName: string
  onSubmitted?: () => void
}

export function RatingModal({
  isOpen,
  onClose,
  requestId,
  toUserId,
  targetName,
  onSubmitted,
}: Props) {
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: rpcErr } = await supabase.rpc('submit_rating_command', {
        p_request_id: requestId,
        p_to_user_id: toUserId,
        p_rating: rating,
        p_comment: comment.trim() || null,
      })

      if (rpcErr) {
        throw new Error(rpcErr.message)
      }

      setSuccess(true)
      setTimeout(() => {
        onSubmitted?.()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review.')
    } finally {
      setIsSubmitting(false)
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

        <div className="space-y-1 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-2 border border-amber-200">
            <Star className="w-6 h-6 fill-current" />
          </div>
          <h3 className="text-xl font-heading font-extrabold text-slate-900">
            Rate Your Experience
          </h3>
          <p className="text-xs text-slate-500">
            Share feedback for <strong className="text-slate-800">{targetName}</strong> to strengthen community trust.
          </p>
        </div>

        {success ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-base font-bold text-emerald-950">Review Submitted!</h4>
            <p className="text-xs text-emerald-800">
              Thank you for contributing to CarryGo&apos;s verified peer network.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                {error}
              </div>
            )}

            {/* Interactive 5-Star Selection */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        isFilled
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200 hover:text-amber-200'
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            <div className="text-center text-xs font-bold text-slate-700">
              {rating === 5 && 'Outstanding & On-Time! 🌟'}
              {rating === 4 && 'Great Experience! 👍'}
              {rating === 3 && 'Average Delivery 📦'}
              {rating === 2 && 'Had Issues ⚠️'}
              {rating === 1 && 'Poor Experience ❌'}
            </div>

            {/* Comment Text Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Feedback &amp; Remarks (Optional)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Prompt communication, package arrived in immaculate condition!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs text-slate-900 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 active:scale-98 transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Review...
                </>
              ) : (
                'Submit Review'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
