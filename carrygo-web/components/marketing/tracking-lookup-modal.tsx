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
  ShieldCheck,
  KeyRound,
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
  pickup_confirmed?: boolean
  delivery_confirmed?: boolean
  traveller_name?: string
  requestId?: string
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

      // 1. First attempt lookup in parcels table
      let parcelQuery = supabase
        .from('parcels')
        .select('id, from_city, to_city, category, weight, status, delivery_date, created_at')

      if (cleanId.length === 36) {
        parcelQuery = parcelQuery.eq('id', cleanId)
      } else {
        parcelQuery = parcelQuery.ilike('id', `${cleanId}%`)
      }

      const { data: parcelData } = await parcelQuery.limit(1).maybeSingle()

      if (parcelData) {
        // Check if there is an associated request/delivery
        const { data: reqData } = await supabase
          .from('requests')
          .select('id, traveller_name, status')
          .eq('parcel_id', parcelData.id)
          .in('status', ['accepted', 'completed'])
          .maybeSingle()

        let deliveryInfo = { pickup_confirmed: false, delivery_confirmed: false }
        if (reqData) {
          const { data: delData } = await supabase
            .from('deliveries')
            .select('pickup_confirmed, delivery_confirmed, status')
            .eq('request_id', reqData.id)
            .maybeSingle()

          if (delData) {
            deliveryInfo = delData
          }
        }

        setResult({
          ...parcelData,
          pickup_confirmed: deliveryInfo.pickup_confirmed,
          delivery_confirmed: deliveryInfo.delivery_confirmed,
          traveller_name: reqData?.traveller_name,
          requestId: reqData?.id,
        } as TrackingResult)
        return
      }

      // 2. Second attempt: Check requests table
      let reqQuery = supabase
        .from('requests')
        .select('id, parcel_id, traveller_name, status, created_at')

      if (cleanId.length === 36) {
        reqQuery = reqQuery.eq('id', cleanId)
      } else {
        reqQuery = reqQuery.ilike('id', `${cleanId}%`)
      }

      const { data: reqRecord } = await reqQuery.limit(1).maybeSingle()

      if (reqRecord && reqRecord.parcel_id) {
        const { data: linkedParcel } = await supabase
          .from('parcels')
          .select('id, from_city, to_city, category, weight, status, delivery_date, created_at')
          .eq('id', reqRecord.parcel_id)
          .maybeSingle()

        if (linkedParcel) {
          const { data: delData } = await supabase
            .from('deliveries')
            .select('pickup_confirmed, delivery_confirmed, status')
            .eq('request_id', reqRecord.id)
            .maybeSingle()

          setResult({
            ...linkedParcel,
            pickup_confirmed: delData?.pickup_confirmed || false,
            delivery_confirmed: delData?.delivery_confirmed || false,
            traveller_name: reqRecord.traveller_name,
            requestId: reqRecord.id,
          } as TrackingResult)
          return
        }
      }

      // 3. Third attempt: Check deliveries table
      let delQuery = supabase
        .from('deliveries')
        .select('id, request_id, pickup_confirmed, delivery_confirmed, status, created_at')

      if (cleanId.length === 36) {
        delQuery = delQuery.eq('id', cleanId)
      } else {
        delQuery = delQuery.ilike('id', `${cleanId}%`)
      }

      const { data: delRecord } = await delQuery.limit(1).maybeSingle()

      if (delRecord && delRecord.request_id) {
        const { data: reqFromDel } = await supabase
          .from('requests')
          .select('id, parcel_id, traveller_name')
          .eq('id', delRecord.request_id)
          .maybeSingle()

        if (reqFromDel && reqFromDel.parcel_id) {
          const { data: pFromDel } = await supabase
            .from('parcels')
            .select('id, from_city, to_city, category, weight, status, delivery_date, created_at')
            .eq('id', reqFromDel.parcel_id)
            .maybeSingle()

          if (pFromDel) {
            setResult({
              ...pFromDel,
              pickup_confirmed: delRecord.pickup_confirmed,
              delivery_confirmed: delRecord.delivery_confirmed,
              traveller_name: reqFromDel.traveller_name,
              requestId: reqFromDel.id,
            } as TrackingResult)
            return
          }
        }
      }

      setError('No active shipment found matching this Tracking ID. Please double-check your code.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve tracking status.')
    } finally {
      setIsLoading(false)
    }
  }

  const getStepProgress = (res: TrackingResult) => {
    if (res.delivery_confirmed || res.status.toLowerCase() === 'delivered') return 4
    if (res.pickup_confirmed || res.status.toLowerCase() === 'in_transit') return 3
    if (res.status.toLowerCase() === 'matched') return 2
    return 1
  }

  const currentStep = result ? getStepProgress(result) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          aria-label="Close tracking modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-heading font-bold text-slate-900">Track Your Shipment</h3>
            <p className="text-xs text-slate-500">Enter your Parcel, Request, or Delivery ID</p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. 7f4a2b91-..."
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className="w-full pl-10 pr-24 py-3 text-sm rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !trackingId.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Track'}
            </button>
          </div>
        </form>

        {/* Search Results */}
        <div className="mt-5">
          {isLoading && (
            <div className="py-8 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              <p className="text-xs">Locating shipment data across network...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 animate-in fade-in duration-150">
              {/* Route & Status Banner */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-slate-900 text-base">
                    {result.from_city}
                  </span>
                  <span className="text-emerald-600 font-bold">➔</span>
                  <span className="font-heading font-bold text-slate-900 text-base">
                    {result.to_city}
                  </span>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold capitalize bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {result.status.replace('_', ' ')}
                </span>
              </div>

              {/* Multi-stage Milestone Stepper */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Delivery Milestones
                </span>

                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { step: 1, label: 'Posted', desc: 'Listing Live' },
                    { step: 2, label: 'Matched', desc: 'Traveler Linked' },
                    { step: 3, label: 'In Transit', desc: 'Pickup OTP' },
                    { step: 4, label: 'Delivered', desc: 'Dropoff OTP' },
                  ].map((m) => {
                    const isDone = currentStep >= m.step
                    const isCurrent = currentStep === m.step

                    return (
                      <div key={m.step} className="space-y-1">
                        <div
                          className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-500'
                          } ${isCurrent ? 'ring-2 ring-emerald-500/30 ring-offset-1' : ''}`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : m.step}
                        </div>
                        <p className={`text-[11px] font-bold ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                          {m.label}
                        </p>
                        <p className="text-[9px] text-slate-400 hidden sm:block">{m.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Shipment Specifications */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] block">Category</span>
                  <span className="font-bold text-slate-800 capitalize truncate block">
                    {result.category}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] block">Weight</span>
                  <span className="font-bold text-slate-800 font-mono block">
                    {result.weight} kg
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] block">Carrier</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {result.traveller_name || 'Matching...'}
                  </span>
                </div>
              </div>

              {/* Handover Security Notice */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Dual Golden Handshake OTP Protected</span>
                </div>
                <span className="font-bold text-emerald-700">SafeVault™</span>
              </div>

              {/* Direct links */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400 text-[10px]">
                  ID: {result.id.slice(0, 8)}...{result.id.slice(-4)}
                </span>
                <Link
                  href="/activity"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800"
                >
                  <span>View in My Deliveries</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
