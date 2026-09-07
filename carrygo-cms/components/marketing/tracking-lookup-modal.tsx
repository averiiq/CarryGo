'use client'

import { useState } from 'react'
import {
  Search,
  X,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

type TrackingResult = {
  id: string
  from_city: string
  to_city: string
  category: string
  weight: number
  status: string
  delivery_date: string
  created_at: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function TrackingLookupModal({ isOpen, onClose }: Props) {
  const [trackingId, setTrackingId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<TrackingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  if (!isOpen) return null

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanId = trackingId.trim()
    if (!cleanId) return

    setIsLoading(true)
    setError(null)
    setResult(null)
    setHasSearched(true)

    try {
      const supabase = createClient()
      // First attempt lookup in parcels
      let query = supabase
        .from('parcels')
        .select('id, from_city, to_city, category, weight, status, delivery_date, created_at')

      // Check if it's a UUID or search by ID prefix
      if (cleanId.length === 36) {
        query = query.eq('id', cleanId)
      } else {
        query = query.ilike('id', `${cleanId}%`)
      }

      const { data, error: fetchErr } = await query.limit(1).maybeSingle()

      if (fetchErr) {
        throw new Error(fetchErr.message)
      }

      if (data) {
        setResult(data as TrackingResult)
      } else {
        setError('No shipment found matching this Tracking ID. Please double-check your code.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve tracking status')
    } finally {
      setIsLoading(false)
    }
  }

  const getStepProgress = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 1
      case 'matched':
        return 2
      case 'picked_up':
      case 'in_transit':
        return 3
      case 'delivered':
        return 4
      default:
        return 1
    }
  }

  const currentStep = result ? getStepProgress(result.status) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-3xl bg-surface border border-border shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-elevated transition cursor-pointer"
          aria-label="Close tracking modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-subtle text-primary border border-primary/20">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-heading font-bold text-foreground">Track Your Parcel</h3>
            <p className="text-xs text-muted">Enter your parcel ID to see live milestone updates</p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="e.g. 7f4a2b91-..."
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className="w-full pl-10 pr-24 py-3 text-sm rounded-2xl border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !trackingId.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Track'}
            </button>
          </div>
        </form>

        {/* Search Results */}
        <div className="mt-5">
          {isLoading && (
            <div className="py-8 text-center text-muted">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-xs">Locating parcel data...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-danger-subtle text-danger border border-danger/20 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-5 rounded-2xl border border-border bg-surface-elevated/50 p-5">
              {/* Route & Status Banner */}
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-foreground text-base">
                    {result.from_city}
                  </span>
                  <span className="text-muted">→</span>
                  <span className="font-heading font-bold text-foreground text-base">
                    {result.to_city}
                  </span>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20 uppercase tracking-wide">
                  {result.status}
                </span>
              </div>

              {/* Progress Milestones */}
              <div className="grid grid-cols-4 gap-2 text-center pt-2">
                {[
                  { step: 1, label: 'Created', icon: Package },
                  { step: 2, label: 'Matched', icon: Clock },
                  { step: 3, label: 'In Transit', icon: Truck },
                  { step: 4, label: 'Delivered', icon: CheckCircle2 },
                ].map(({ step, label, icon: Icon }) => {
                  const isDone = currentStep >= step
                  const isCurrent = currentStep === step
                  return (
                    <div key={label} className="space-y-1">
                      <div
                        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition ${
                          isDone
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'bg-surface border border-border text-muted'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <p
                        className={`text-[11px] ${
                          isCurrent
                            ? 'font-semibold text-primary'
                            : isDone
                            ? 'text-foreground'
                            : 'text-muted'
                        }`}
                      >
                        {label}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Parcel Details */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/70 text-muted">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                    Category
                  </span>
                  <span className="font-medium text-foreground capitalize">
                    {result.category}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                    Weight
                  </span>
                  <span className="font-medium text-foreground">{result.weight} kg</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                    Expected Delivery
                  </span>
                  <span className="font-medium text-foreground">
                    {new Date(result.delivery_date).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                    Handover Security
                  </span>
                  <span className="font-medium text-success">Dual-OTP Protected</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link
                  href={`/search?from=${encodeURIComponent(result.from_city)}&to=${encodeURIComponent(result.to_city)}`}
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border border-border text-muted hover:text-foreground hover:bg-surface transition"
                >
                  <span>Explore Travelers on This Route</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {!hasSearched && !isLoading && (
            <div className="py-6 text-center text-muted">
              <Package className="w-8 h-8 mx-auto mb-2 text-muted/40" />
              <p className="text-xs">
                You can find your Parcel Tracking ID in your booking confirmation or SMS alert.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
