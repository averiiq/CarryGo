'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface RatingConfig {
  label: string
  subtext: string
  color: string
  bgTint: string
  mouthPath: string
  eyeType: 'sad' | 'neutral' | 'happy' | 'star'
  tags?: string[]
}

const RATING_DATA: Record<number, RatingConfig> = {
  0: {
    label: 'Rate your experience',
    subtext: 'Tap or select across the stars',
    color: '#94A3B8',
    bgTint: '#F8FAFC',
    mouthPath: 'M 38 62 Q 50 62 62 62',
    eyeType: 'neutral',
  },
  1: {
    label: 'Rough',
    subtext: 'What went wrong?',
    color: '#EF4444',
    bgTint: '#FEF2F2',
    mouthPath: 'M 36 66 Q 50 52 64 66',
    eyeType: 'sad',
    tags: ['Late Delivery', 'Damaged Item', 'Unresponsive', 'Wrong Location'],
  },
  2: {
    label: 'Underwhelming',
    subtext: 'How can we improve?',
    color: '#F97316',
    bgTint: '#FFF7ED',
    mouthPath: 'M 38 63 Q 50 57 62 63',
    eyeType: 'sad',
    tags: ['Delayed Pickup', 'Communication Gap', 'Handling Issue', 'Scheduling'],
  },
  3: {
    label: 'Decent',
    subtext: 'What would make it 5 stars?',
    color: '#EAB308',
    bgTint: '#FEFCE8',
    mouthPath: 'M 38 60 Q 50 62 62 60',
    eyeType: 'neutral',
    tags: ['Minor Delay', 'Could Be Faster', 'Needed More Updates'],
  },
  4: {
    label: 'Great',
    subtext: 'Really enjoyed it',
    color: '#10B981',
    bgTint: '#ECFDF5',
    mouthPath: 'M 35 57 Q 50 70 65 57',
    eyeType: 'happy',
    tags: ['On Time', 'Careful Handling', 'Polite & Friendly', 'Prompt Handover'],
  },
  5: {
    label: 'Obsessed!',
    subtext: 'Exceeded every expectation',
    color: '#8B5CF6',
    bgTint: '#F5F3FF',
    mouthPath: 'M 33 55 Q 50 75 67 55 Z',
    eyeType: 'star',
    tags: ['Lightning Fast', 'Careful Handling', 'Super Friendly', 'Flawless Handover'],
  },
}

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
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const activeRating = hoverRating || rating
  const currentConfig = RATING_DATA[activeRating] || RATING_DATA[0]

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const renderEyes = (type: RatingConfig['eyeType'], color: string) => {
    switch (type) {
      case 'sad':
        return (
          <g>
            <path
              d="M 28 36 L 38 40 M 72 36 L 62 40"
              stroke={color}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle cx="35" cy="45" r="4" fill={color} />
            <circle cx="65" cy="45" r="4" fill={color} />
          </g>
        )
      case 'happy':
        return (
          <g>
            <path
              d="M 29 44 Q 35 36 41 44"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 59 44 Q 65 36 71 44"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )
      case 'star':
        return (
          <g fill={color}>
            <path
              transform="translate(26, 33) scale(0.75)"
              d="M12 2L14.8 8.5L22 9.3L16.5 14L18.2 21L12 17.3L5.8 21L7.5 14L2 9.3L9.2 8.5L12 2Z"
            />
            <path
              transform="translate(56, 33) scale(0.75)"
              d="M12 2L14.8 8.5L22 9.3L16.5 14L18.2 21L12 17.3L5.8 21L7.5 14L2 9.3L9.2 8.5L12 2Z"
            />
          </g>
        )
      default:
        return (
          <g>
            <circle cx="35" cy="43" r="4.5" fill={color} />
            <circle cx="65" cy="43" r="4.5" fill={color} />
          </g>
        )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a star rating to rate your experience.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    let finalComment = comment.trim()
    if (selectedTags.length > 0) {
      const prefix = `[${selectedTags.join(', ')}]`
      finalComment = finalComment ? `${prefix} ${finalComment}` : prefix
    }

    try {
      const supabase = createClient()
      const { error: rpcErr } = await supabase.rpc('submit_rating_command', {
        p_request_id: requestId,
        p_to_user_id: toUserId,
        p_rating: rating,
        p_comment: finalComment || null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-sm rounded-3xl p-6 md:p-7 bg-white shadow-2xl border border-slate-200 space-y-4 relative text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Animated Expression Orb */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center border-2 mx-auto transition-all duration-300 transform"
          style={{
            backgroundColor: currentConfig.bgTint,
            borderColor: `${currentConfig.color}40`,
          }}
        >
          <svg width="76" height="76" viewBox="0 0 100 100">
            {renderEyes(currentConfig.eyeType, currentConfig.color)}
            <path
              d={currentConfig.mouthPath}
              stroke={currentConfig.color}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={activeRating === 5 ? currentConfig.color : 'none'}
            />
          </svg>
        </div>

        {/* Dynamic Copy */}
        <div className="space-y-1">
          <h3
            className="text-xl font-bold tracking-tight text-slate-900 transition-colors"
            style={{ color: activeRating > 0 ? currentConfig.color : '#0F172A' }}
          >
            {currentConfig.label}
          </h3>
          <p className="text-xs text-slate-500">
            {activeRating === 0
              ? `How was your delivery with ${targetName}?`
              : currentConfig.subtext}
          </p>
        </div>

        {success ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold text-emerald-950">Review Submitted!</h4>
            <p className="text-xs text-emerald-800">
              Thank you for contributing to CaryGoo&apos;s verified peer network.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-800 text-left">
                {error}
              </div>
            )}

            {/* Interactive 5-Star Selection */}
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center p-1.5 transition-all transform hover:scale-115 active:scale-90 cursor-pointer"
                    style={{
                      backgroundColor: isFilled ? currentConfig.bgTint : '#F8FAFC',
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24">
                      <path
                        d="M12 2.5L14.9 8.6L21.6 9.4L16.7 14L17.9 20.6L12 17.4L6.1 20.6L7.3 14L2.4 9.4L9.1 8.6L12 2.5Z"
                        fill={isFilled ? currentConfig.color : 'transparent'}
                        stroke={isFilled ? currentConfig.color : '#CBD5E1'}
                        strokeWidth={2}
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )
              })}
            </div>

            {/* Quick Feedback Chips */}
            {currentConfig.tags && (
              <div className="flex flex-wrap gap-1.5 justify-center pt-1 animate-in fade-in duration-200">
                {currentConfig.tags.map((tag) => {
                  const active = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        active
                          ? 'border-transparent text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                      style={active ? { backgroundColor: currentConfig.color } : {}}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Comment Text Area */}
            <div className="space-y-1 text-left">
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add details about the trip or handover (optional)..."
                maxLength={200}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-300 text-xs text-slate-900 transition resize-none outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="w-full py-3 rounded-2xl text-white font-bold text-sm active:scale-98 transition shadow-md disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
              style={{
                backgroundColor: rating > 0 ? currentConfig.color : '#94A3B8',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Review...
                </>
              ) : (
                'Submit Rating'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
