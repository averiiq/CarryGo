'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  MessageCircle,
  Package,
  PlusCircle,
  Route,
  Send,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type Props =
  | { mode: 'trip'; tripId: string; suggestedPrice: number; fromCity?: string; toCity?: string }
  | { mode: 'parcel'; parcelId: string; suggestedPrice: number; fromCity?: string; toCity?: string }

type UserParcel = {
  id: string
  from_city: string
  to_city: string
  category: string
  weight: number
  price_offer: number
  description: string
}

type UserTrip = {
  id: string
  from_city: string
  to_city: string
  date: string
  vehicle_type: string
  available_capacity: number
  price_per_kg: number
}

function extractId(value: unknown): string | null {
  if (!value) return null
  if (Array.isArray(value)) return extractId(value[0])
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }
  return null
}

export function RequestIntentForm(props: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingListings, setLoadingListings] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [userParcels, setUserParcels] = useState<UserParcel[]>([])
  const [userTrips, setUserTrips] = useState<UserTrip[]>([])
  const [selectedListingId, setSelectedListingId] = useState<string>('')
  const [price, setPrice] = useState(String(Math.max(1, Math.round(props.suggestedPrice || 100))))
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)

  // Check auth and load user's listings when form opens
  useEffect(() => {
    if (!isOpen) return

    const loadUserListings = async () => {
      setLoadingListings(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsLoggedIn(false)
        setLoadingListings(false)
        return
      }

      setIsLoggedIn(true)

      if (props.mode === 'trip') {
        // Senders need to select one of their open parcels
        const { data: parcels } = await supabase
          .from('parcels')
          .select('id, from_city, to_city, category, weight, price_offer, description')
          .eq('user_id', user.id)
          .in('status', ['open', 'matched'])
          .order('created_at', { ascending: false })

        const list = (parcels as UserParcel[]) || []
        setUserParcels(list)
        if (list.length > 0) {
          setSelectedListingId(list[0].id)
        }
      } else {
        // Travelers need to select one of their active trips
        const { data: trips } = await supabase
          .from('trips')
          .select('id, from_city, to_city, date, vehicle_type, available_capacity, price_per_kg')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        const list = (trips as UserTrip[]) || []
        setUserTrips(list)
        if (list.length > 0) {
          setSelectedListingId(list[0].id)
        }
      }

      setLoadingListings(false)
    }

    void loadUserListings()
  }, [isOpen, props.mode])

  async function handleSubmit() {
    setNotice(null)
    setConversationId(null)

    if (!selectedListingId) {
      setNotice({
        type: 'error',
        message: props.mode === 'trip' ? 'Please select a parcel to send.' : 'Please select a trip to offer.',
      })
      return
    }

    const numericPrice = Number(price)
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setNotice({ type: 'error', message: 'Price must be a positive number.' })
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setNotice({ type: 'error', message: 'Please login first to create a request.' })
        return
      }

      const payload =
        props.mode === 'trip'
          ? {
              p_parcel_id: selectedListingId,
              p_trip_id: props.tripId,
              p_price: numericPrice,
              p_message: message.trim() || null,
            }
          : {
              p_parcel_id: props.parcelId,
              p_trip_id: selectedListingId,
              p_price: numericPrice,
              p_message: message.trim() || null,
            }

      const requestRes = await supabase.rpc('create_request_command', payload)

      if (requestRes.error) {
        setNotice({ type: 'error', message: requestRes.error.message })
        return
      }

      const requestId = extractId(requestRes.data)
      if (requestId) {
        const conversationRes = await supabase.rpc('create_conversation_for_request', {
          p_request_id: requestId,
        })

        if (!conversationRes.error) {
          const convId = extractId(conversationRes.data)
          if (convId) {
            setConversationId(convId)
          }
        }
      }

      setNotice({
        type: 'success',
        message: 'Delivery request submitted successfully! SafeVault™ escrow will hold funds upon acceptance.',
      })
      setMessage('')
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to create request.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 transition-all">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{isOpen ? 'Close Booking Drawer' : 'Send Delivery Request'}</span>
        </button>

        <span className="text-[11px] font-semibold text-slate-500">
          Escrow Protected
        </span>
      </div>

      {isOpen && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-200 space-y-3.5 animate-in fade-in duration-150">
          {/* Unauthenticated View */}
          {isLoggedIn === false && (
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-center space-y-2.5">
              <Lock className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-800">
                Sign in to send delivery request
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Connect with verified community travelers with dual-OTP protection.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent('/search')}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
              >
                <span>Sign In / Register</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Loading State */}
          {loadingListings && (
            <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Checking your active listings...</span>
            </div>
          )}

          {/* Authenticated View */}
          {isLoggedIn && !loadingListings && (
            <>
              {/* Listing Selection */}
              {props.mode === 'trip' ? (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Select Your Parcel to Ship
                  </label>

                  {userParcels.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {userParcels.map((p) => {
                        const isSelected = selectedListingId === p.id
                        return (
                          <label
                            key={p.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-white border-emerald-500 ring-1 ring-emerald-500/20 shadow-xs'
                                : 'bg-white/60 border-slate-200 hover:bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="selectedParcel"
                              checked={isSelected}
                              onChange={() => setSelectedListingId(p.id)}
                              className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between font-bold text-slate-900">
                                <span>{p.from_city} ➔ {p.to_city}</span>
                                <span className="font-mono text-emerald-700">{p.weight} kg</span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {p.category} • {p.description || 'Package ready'}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                      <p className="font-semibold">No open parcels found on your account.</p>
                      <Link
                        href={`/create-parcel?from=${encodeURIComponent(
                          props.fromCity || ''
                        )}&to=${encodeURIComponent(props.toCity || '')}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Post a Parcel for this Route</span>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Select Your Trip
                  </label>

                  {userTrips.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {userTrips.map((t) => {
                        const isSelected = selectedListingId === t.id
                        return (
                          <label
                            key={t.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-white border-emerald-500 ring-1 ring-emerald-500/20 shadow-xs'
                                : 'bg-white/60 border-slate-200 hover:bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="selectedTrip"
                              checked={isSelected}
                              onChange={() => setSelectedListingId(t.id)}
                              className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between font-bold text-slate-900">
                                <span>{t.from_city} ➔ {t.to_city}</span>
                                <span className="font-mono text-emerald-700">{t.available_capacity} kg open</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {t.date} • {t.vehicle_type}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 space-y-2">
                      <p className="font-semibold">No active travel trips found on your account.</p>
                      <Link
                        href={`/create-trip?from=${encodeURIComponent(
                          props.fromCity || ''
                        )}&to=${encodeURIComponent(props.toCity || '')}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-[11px] hover:bg-sky-700 transition"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Post a Trip on this Route</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Price Offer & Message Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Offer Price (₹)
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Note to Traveler (Optional)
                  </span>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. Can meet near station"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </label>
              </div>

              {/* Notices */}
              {notice && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    notice.type === 'error'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  {notice.type === 'error' ? (
                    <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">{notice.message}</p>
                    {conversationId && (
                      <Link
                        href={`/chat/${conversationId}`}
                        className="inline-flex items-center gap-1 font-bold underline text-emerald-800 hover:text-emerald-900"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Open Private Chat</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedListingId}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Delivery Request</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
