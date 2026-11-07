'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Truck,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface ParcelRow {
  id: string
  category: string
  description: string
  weight: number
  price_offer: number
  from_city: string
  to_city: string
  delivery_date: string
  image_url?: string | null
}

interface TripRow {
  id: string
  from_city: string
  to_city: string
  date: string
  time: string
  vehicle_type: string
  available_capacity: number
  price_per_kg: number
}

interface Props {
  requestId: string
  parcelId: string
  tripId: string
  senderName?: string
  travellerName?: string
  price: number
  message?: string | null
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'
  currentUserIsTraveller: boolean
  onClose: () => void
  onAction?: (next: 'accepted' | 'declined' | 'cancelled') => Promise<void> | void
  actionInFlight?: boolean
}

export function RequestDetailModal({
  requestId,
  parcelId,
  tripId,
  senderName,
  travellerName,
  price,
  message,
  status,
  currentUserIsTraveller,
  onClose,
  onAction,
  actionInFlight = false,
}: Props) {
  const [parcel, setParcel] = useState<ParcelRow | null>(null)
  const [trip, setTrip] = useState<TripRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const sb = createClient()
      const [pRes, tRes] = await Promise.all([
        sb
          .from('parcels')
          .select('id, category, description, weight, price_offer, from_city, to_city, delivery_date, image_url')
          .eq('id', parcelId)
          .maybeSingle(),
        sb
          .from('trips')
          .select('id, from_city, to_city, date, time, vehicle_type, available_capacity, price_per_kg')
          .eq('id', tripId)
          .maybeSingle(),
      ])
      if (cancelled) return
      if (pRes.error) setError(pRes.error.message)
      if (tRes.error) setError((e) => e ?? tRes.error?.message ?? null)
      setParcel((pRes.data as ParcelRow | null) ?? null)
      setTrip((tRes.data as TripRow | null) ?? null)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [parcelId, tripId])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-6">
      <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-heading font-extrabold text-slate-900">
              Delivery request
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review the full context before you {currentUserIsTraveller ? 'accept or decline' : 'cancel'} this request.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {loading ? (
            <div className="py-10 flex items-center justify-center text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {parcel?.category ?? 'Parcel'} · {parcel?.weight ?? 0} kg
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3" /> {parcel?.from_city} → {parcel?.to_city}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                    ₹{price}
                  </span>
                </div>
                {parcel?.description && (
                  <p className="text-xs text-slate-600 pt-1 border-t border-slate-200/70">
                    {parcel.description}
                  </p>
                )}
                {parcel?.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={parcel.image_url}
                    alt="Parcel"
                    className="mt-2 w-full max-h-48 object-cover rounded-xl border border-slate-200"
                  />
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {trip?.vehicle_type ?? 'Trip'} · {trip?.available_capacity ?? 0} kg capacity
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <Calendar className="w-3 h-3" />
                      {trip?.date}
                      {trip?.time ? ` at ${trip.time}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {currentUserIsTraveller ? 'Sender' : 'Traveller'}
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {currentUserIsTraveller ? senderName ?? 'Sender' : travellerName ?? 'Traveller'}
                  </p>
                </div>
              </div>

              {message && (
                <div className="rounded-2xl border border-slate-200 bg-amber-50/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> Message
                  </p>
                  <p className="text-xs text-slate-700 whitespace-pre-line">{message}</p>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                  {error}
                </div>
              )}

              {onAction && status === 'pending' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {currentUserIsTraveller ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onAction('declined')}
                        disabled={actionInFlight}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction('accepted')}
                        disabled={actionInFlight}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
                      >
                        {actionInFlight ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Accept
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAction('cancelled')}
                      disabled={actionInFlight}
                      className="col-span-2 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel request
                    </button>
                  )}
                </div>
              )}

              <a
                href={`/delivery/${requestId}`}
                className="block text-center text-xs font-bold text-emerald-700 hover:underline pt-1"
              >
                Open full delivery tracking →
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
