'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Send,
  X,
} from 'lucide-react'
import {
  createConversationForRequest,
  sendCounterOffer,
} from '@/services/requests.service'

export interface NegotiateTripInfo {
  id: string
  userName: string
  fromCity: string
  toCity: string
  date?: string
  time?: string
  availableCapacity?: number
  pricePerKg?: number
}

export interface NegotiateParcelInfo {
  id: string
  category: string
  weight: number
}

interface Props {
  open: boolean
  onClose: () => void
  trip: NegotiateTripInfo
  parcel?: NegotiateParcelInfo
  /** Fallback base fare when parcel/trip pricing is unavailable. */
  initialPrice?: number
  /** Called on a successful offer send; parent can refetch / show toast. */
  onOfferSent?: (requestId: string) => void
}

export function NegotiateTripModal({
  open,
  onClose,
  trip,
  parcel,
  initialPrice,
  onOfferSent,
}: Props) {
  const router = useRouter()

  const baseListedPrice = useMemo(() => {
    if (typeof initialPrice === 'number' && initialPrice > 0) return initialPrice
    if (trip.pricePerKg && parcel) return Math.max(80, Math.round(trip.pricePerKg * (parcel.weight || 1)))
    if (trip.pricePerKg) return Math.max(80, Math.round(trip.pricePerKg * 2))
    return 180
  }, [initialPrice, trip, parcel])

  const [pickupLandmark, setPickupLandmark] = useState('')
  const [dropLandmark, setDropLandmark] = useState('')
  const [offeredPrice, setOfferedPrice] = useState(baseListedPrice)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState<null | 'offer' | 'chat'>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPickupLandmark(trip.fromCity)
      setDropLandmark(trip.toCity)
      setOfferedPrice(baseListedPrice)
      setNote('')
      setError(null)
      setSubmitting(null)
    }
  }, [open, trip.fromCity, trip.toCity, baseListedPrice])

  if (!open) return null

  const priceDiff = offeredPrice - baseListedPrice
  const adjust = (delta: number) => setOfferedPrice((p) => Math.max(50, p + delta))

  const pickupSuggestions = [
    `${trip.fromCity} Bus Stand`,
    `${trip.fromCity} Railway Stn`,
    'Highway Toll Plaza',
  ]
  const dropSuggestions = [
    `${trip.toCity} Bus Stand`,
    `${trip.toCity} Railway Stn`,
    'City Center',
  ]

  const parcelIdForOffer = parcel?.id

  const handleSendOffer = async () => {
    setError(null)
    if (!parcelIdForOffer) {
      setError('Pick one of your parcels before sending an offer.')
      return
    }
    setSubmitting('offer')
    const priceToSend = Math.max(50, Math.round(Number(offeredPrice) || baseListedPrice))
    const result = await sendCounterOffer({
      parcelId: parcelIdForOffer,
      tripId: trip.id,
      offeredPrice: priceToSend,
      pickupLandmark: pickupLandmark.trim() || trip.fromCity,
      dropLandmark: dropLandmark.trim() || trip.toCity,
      note,
      travellerName: trip.userName,
      listedPrice: baseListedPrice,
    })
    setSubmitting(null)
    if (!result.data) {
      setError(result.error ?? 'Could not send offer.')
      return
    }
    onOfferSent?.(result.data.requestId)
    onClose()
  }

  const handleStartChat = async () => {
    setError(null)
    if (!parcelIdForOffer) {
      setError('Pick one of your parcels before starting a chat.')
      return
    }
    setSubmitting('chat')
    const priceToSend = Math.max(50, Math.round(Number(offeredPrice) || baseListedPrice))
    const offer = await sendCounterOffer({
      parcelId: parcelIdForOffer,
      tripId: trip.id,
      offeredPrice: priceToSend,
      pickupLandmark: pickupLandmark.trim() || trip.fromCity,
      dropLandmark: dropLandmark.trim() || trip.toCity,
      note,
      travellerName: trip.userName,
      listedPrice: baseListedPrice,
    })
    if (!offer.data) {
      setSubmitting(null)
      setError(offer.error ?? 'Could not initiate chat.')
      return
    }
    const conv = await createConversationForRequest(offer.data.requestId)
    setSubmitting(null)
    if (!conv.data) {
      setError(conv.error ?? 'Request sent but chat could not be opened.')
      return
    }
    onClose()
    router.push(`/chat/${conv.data.conversationId}`)
  }

  const diffLabel =
    priceDiff === 0
      ? 'Matches listed fare'
      : priceDiff < 0
        ? `₹${Math.abs(priceDiff)} below`
        : `₹${priceDiff} bonus`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-heading font-extrabold text-slate-900">
              Negotiate Delivery
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Propose pickup &amp; drop landmarks, fare offer, or chat with {trip.userName}.
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

        <div className="px-5 py-5 space-y-6">
          {/* Route snapshot */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">
                    {trip.fromCity} → {trip.toCity}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {trip.date}
                    {trip.time ? ` at ${trip.time}` : ''}
                    {trip.availableCapacity ? ` · ${trip.availableCapacity} kg capacity` : ''}
                  </p>
                </div>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Listed ₹{baseListedPrice}
              </span>
            </div>
            {parcel && (
              <p className="mt-2.5 pt-2.5 border-t border-slate-200 text-[11px] text-slate-500">
                Your parcel: <b className="text-slate-700">{parcel.category}</b> · {parcel.weight} kg
              </p>
            )}
          </div>

          {/* Pickup & drop */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              1. Pickup &amp; Drop Landmarks
            </h3>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600">Pickup spot</label>
              <input
                type="text"
                value={pickupLandmark}
                onChange={(e) => setPickupLandmark(e.target.value)}
                placeholder={`${trip.fromCity} Bus Stand Gate 2`}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 transition"
              />
              <div className="flex flex-wrap gap-1.5">
                {pickupSuggestions.map((s) => {
                  const active = pickupLandmark === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPickupLandmark(s)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                        active
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600">Drop-off spot</label>
              <input
                type="text"
                value={dropLandmark}
                onChange={(e) => setDropLandmark(e.target.value)}
                placeholder={`${trip.toCity} Junction or City Center`}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 transition"
              />
              <div className="flex flex-wrap gap-1.5">
                {dropSuggestions.map((s) => {
                  const active = dropLandmark === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDropLandmark(s)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                        active
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                2. Propose Fare
              </h3>
              <span
                className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${
                  priceDiff < 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : priceDiff > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {diffLabel}
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <button
                type="button"
                onClick={() => adjust(-20)}
                className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                aria-label="Decrease fare"
              >
                <Minus className="w-4 h-4 text-slate-700" />
              </button>
              <div className="flex-1 flex items-center justify-center gap-1">
                <span className="text-xl font-bold text-slate-500">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={String(offeredPrice)}
                  onChange={(e) => {
                    const n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10)
                    setOfferedPrice(Number.isNaN(n) ? 0 : n)
                  }}
                  className="w-24 text-center text-2xl font-extrabold text-slate-900 bg-transparent border-0 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => adjust(20)}
                className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                aria-label="Increase fare"
              >
                <Plus className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[-50, -20, 0, 20, 50].map((delta) => {
                const target = Math.max(50, baseListedPrice + delta)
                const active = offeredPrice === target
                return (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setOfferedPrice(target)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                      active
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {delta === 0 ? `₹${baseListedPrice}` : delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600">
              Optional note to {trip.userName}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything else they should know? (fragile, time-sensitive, etc.)"
              rows={2}
              maxLength={300}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 transition resize-none"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleStartChat}
              disabled={submitting !== null}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition"
            >
              {submitting === 'chat' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MessageCircle className="w-3.5 h-3.5" />
              )}
              Start Chat Instead
            </button>
            <button
              type="button"
              onClick={handleSendOffer}
              disabled={submitting !== null}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
            >
              {submitting === 'offer' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send Offer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
