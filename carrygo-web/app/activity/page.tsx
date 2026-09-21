'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileCheck,
  KeyRound,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Package,
  Plane,
  RefreshCw,
  Route,
  ShieldAlert,
  ShieldCheck,
  Star,
  Truck,
  XCircle,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { createClient } from '@/utils/supabase/client'
import { OtpHandshakeModal } from '@/components/delivery/otp-handshake-modal'
import { RatingModal } from '@/components/delivery/rating-modal'

type Tab = 'parcels' | 'trips' | 'payments'

interface Parcel {
  id: string
  from_city: string
  to_city: string
  category: string
  description: string
  weight: number
  price_offer: number
  status: string
  delivery_date: string
  created_at: string
}

interface Trip {
  id: string
  from_city: string
  to_city: string
  date: string
  time: string
  vehicle_type: string
  available_capacity: number
  price_per_kg: number
  status: string
  created_at: string
}

interface BookingRequest {
  id: string
  parcel_id: string
  trip_id: string
  sender_id: string
  sender_name: string
  traveller_id: string
  traveller_name: string
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'
  price: number
  message?: string
  created_at: string
}

interface PaymentRecord {
  id: string
  request_id: string
  amount: number
  status: 'locked' | 'released' | 'refunded'
  created_at: string
  locked_at?: string
  released_at?: string
}

interface DeliveryRecord {
  id: string
  request_id: string
  pickup_confirmed: boolean
  delivery_confirmed: boolean
  status: string
  delivery_otp?: string
  created_at: string
}

export default function CustomerActivityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('parcels')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  const [parcels, setParcels] = useState<Parcel[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('User')

  // Modals state
  const [otpModalState, setOtpModalState] = useState<{
    isOpen: boolean
    requestId: string
    deliveryId?: string
    isTraveler: boolean
  }>({
    isOpen: false,
    requestId: '',
    isTraveler: false,
  })

  const [ratingModalState, setRatingModalState] = useState<{
    isOpen: boolean
    requestId: string
    toUserId: string
    targetName: string
  }>({
    isOpen: false,
    requestId: '',
    toUserId: '',
    targetName: '',
  })

  const loadData = async () => {
    setLoading(true)
    setActionError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    setUserId(user.id)
    setUserName((user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User')

    // 1. Fetch user parcels
    const { data: parcelsData } = await supabase
      .from('parcels')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // 2. Fetch user trips
    const { data: tripsData } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // 3. Fetch requests involving user
    const { data: reqData } = await supabase
      .from('requests')
      .select('*')
      .or(`sender_id.eq.${user.id},traveller_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    const reqList = (reqData as BookingRequest[]) || []

    // 4. Fetch payments involving user
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*')
      .or(`sender_id.eq.${user.id},traveller_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    // 5. Fetch deliveries associated with requests
    let delList: DeliveryRecord[] = []
    if (reqList.length > 0) {
      const reqIds = reqList.map((r) => r.id)
      const { data: delData } = await supabase
        .from('deliveries')
        .select('id, request_id, pickup_confirmed, delivery_confirmed, status, delivery_otp, created_at')
        .in('request_id', reqIds)

      delList = (delData as DeliveryRecord[]) || []
    }

    setParcels(parcelsData || [])
    setTrips(tripsData || [])
    setRequests(reqList)
    setPayments(paymentsData || [])
    setDeliveries(delList)
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  // Transition request via canonical RPC command
  const handleTransitionRequest = async (requestId: string, nextStatus: 'accepted' | 'declined' | 'cancelled') => {
    setActionError(null)
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('transition_request_status', {
        p_request_id: requestId,
        p_next_status: nextStatus,
      })

      if (error) {
        throw new Error(error.message)
      }

      startTransition(() => {
        void loadData()
      })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update request.')
    }
  }

  // Confirm parcel pickup by traveler
  const handleConfirmPickup = async (deliveryId: string) => {
    setActionError(null)
    const supabase = createClient()
    try {
      const { error } = await supabase.rpc('confirm_delivery_pickup', {
        p_delivery_id: deliveryId,
      })

      if (error) throw error

      startTransition(() => {
        void loadData()
      })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to confirm pickup.')
    }
  }

  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
                My Activity &amp; Deliveries
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live Network
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Manage requests with real-time transition locks, dual-OTP handovers, and escrow payouts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading || isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/create-parcel"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
            >
              + Send Parcel
            </Link>
            <Link
              href="/create-trip"
              className="px-4 py-2 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition"
            >
              + Offer Trip
            </Link>
          </div>
        </div>

        {actionError && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center justify-between">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-rose-600 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 mt-6 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('parcels')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'parcels'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-600" />
            <span>My Parcels (Sender)</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-200 font-bold text-slate-700">
              {parcels.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trips')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'trips'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Plane className="w-4 h-4 text-sky-600" />
            <span>My Trips (Traveler)</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-200 font-bold text-slate-700">
              {trips.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span>Escrow &amp; Payments</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-200 font-bold text-slate-700">
              {payments.length}
            </span>
          </button>
        </div>

        {/* Tab 1: My Parcels (Sender View) */}
        {activeTab === 'parcels' && (
          <div className="mt-6 space-y-4">
            {parcels.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center border border-slate-200/80 bg-white space-y-3">
                <Package className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No Parcels Posted Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Send documents, electronics, or personal items quickly with a verified traveler heading your way.
                </p>
                <Link
                  href="/create-parcel"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                >
                  Post Your First Parcel <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              parcels.map((parcel) => {
                const parcelReqs = requests.filter((r) => r.parcel_id === parcel.id)

                return (
                  <div
                    key={parcel.id}
                    className="glass-card rounded-2xl p-5 border border-slate-200 bg-white/95 shadow-sm space-y-4 hover:border-emerald-200 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">
                            {parcel.from_city} ➔ {parcel.to_city}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                            {parcel.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{parcel.description}</p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          ₹{parcel.price_offer}
                        </span>
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {parcel.weight} kg
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            parcel.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : parcel.status === 'in_transit'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {parcel.status}
                        </span>
                      </div>
                    </div>

                    {/* Booking Requests for this Parcel */}
                    {parcelReqs.length > 0 && (
                      <div className="rounded-xl bg-slate-50 p-3.5 space-y-2.5 border border-slate-200/80">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Route className="w-3.5 h-3.5 text-emerald-600" />
                          Matched Traveler Requests ({parcelReqs.length})
                        </span>

                        {parcelReqs.map((req) => {
                          const payment = payments.find((p) => p.request_id === req.id)
                          const delivery = deliveries.find((d) => d.request_id === req.id)
                          const isDelivered = req.status === 'completed' || delivery?.delivery_confirmed

                          return (
                            <div
                              key={req.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">
                                    Traveler: {req.traveller_name}
                                  </span>
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      req.status === 'accepted'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : req.status === 'declined'
                                        ? 'bg-rose-100 text-rose-800'
                                        : req.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {req.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">Agreed Delivery Fee: ₹{req.price}</p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/chat?requestId=${req.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-sky-600" /> Chat
                                </Link>

                                <Link
                                  href={`/delivery/${req.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700"
                                >
                                  <Truck className="w-3.5 h-3.5 text-emerald-600" /> Tracking
                                </Link>

                                {req.status === 'accepted' && !payment && (
                                  <Link
                                    href={`/payment/${req.id}`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xs"
                                  >
                                    <Lock className="w-3.5 h-3.5" /> Pay &amp; Lock Escrow
                                  </Link>
                                )}

                                {payment && (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    {payment.status === 'released' ? 'Escrow Released' : 'Escrow Locked'}
                                  </span>
                                )}

                                {/* Sender Delivery Passkey Button */}
                                {req.status === 'accepted' && payment && !isDelivered && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOtpModalState({
                                        isOpen: true,
                                        requestId: req.id,
                                        deliveryId: delivery?.id,
                                        isTraveler: false,
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-emerald-600 transition cursor-pointer"
                                  >
                                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>View Delivery OTP</span>
                                  </button>
                                )}

                                {/* Rate Traveler Button */}
                                {isDelivered && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRatingModalState({
                                        isOpen: true,
                                        requestId: req.id,
                                        toUserId: req.traveller_id,
                                        targetName: req.traveller_name,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs cursor-pointer transition"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-current" />
                                    <span>Rate Traveler</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Deliver by: {parcel.delivery_date}</span>
                      <span>ID: {parcel.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Tab 2: My Trips (Traveler View) */}
        {activeTab === 'trips' && (
          <div className="mt-6 space-y-4">
            {trips.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center border border-slate-200/80 bg-white space-y-3">
                <Plane className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No Trips Scheduled Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Traveling soon? Carry a small package in your spare baggage space and cover your travel expenses.
                </p>
                <Link
                  href="/create-trip"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                >
                  Offer a Trip <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              trips.map((trip) => {
                const tripReqs = requests.filter((r) => r.trip_id === trip.id)

                return (
                  <div
                    key={trip.id}
                    className="glass-card rounded-2xl p-5 border border-slate-200 bg-white/95 shadow-sm space-y-4 hover:border-emerald-200 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">
                            {trip.from_city} ➔ {trip.to_city}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                            {trip.vehicle_type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Departure: {trip.date} at {trip.time}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          ₹{trip.price_per_kg}/kg
                        </span>
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {trip.available_capacity} kg capacity
                        </span>
                      </div>
                    </div>

                    {/* Incoming Booking Requests from Senders */}
                    {tripReqs.length > 0 ? (
                      <div className="rounded-xl bg-slate-50 p-3.5 space-y-2.5 border border-slate-200/80">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-emerald-600" />
                          Incoming Parcel Delivery Requests ({tripReqs.length})
                        </span>

                        {tripReqs.map((req) => {
                          const delivery = deliveries.find((d) => d.request_id === req.id)
                          const isDelivered = req.status === 'completed' || delivery?.delivery_confirmed
                          const isPickedUp = delivery?.pickup_confirmed

                          return (
                            <div
                              key={req.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">
                                    Sender: {req.sender_name}
                                  </span>
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      req.status === 'accepted'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : req.status === 'declined'
                                        ? 'bg-rose-100 text-rose-800'
                                        : req.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {req.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">Offered Reward: ₹{req.price}</p>
                                {req.message && (
                                  <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                    &ldquo;{req.message}&rdquo;
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/chat?requestId=${req.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-sky-600" /> Chat
                                </Link>

                                <Link
                                  href={`/delivery/${req.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700"
                                >
                                  <Truck className="w-3.5 h-3.5 text-emerald-600" /> Tracking
                                </Link>

                                {req.status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleTransitionRequest(req.id, 'accepted')}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition cursor-pointer"
                                    >
                                      Accept Request
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleTransitionRequest(req.id, 'declined')}
                                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition cursor-pointer"
                                    >
                                      Decline
                                    </button>
                                  </>
                                )}

                                {/* Pickup Confirmation Button for Traveler */}
                                {req.status === 'accepted' && !isPickedUp && !isDelivered && (
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmPickup(delivery?.id || req.id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-bold hover:bg-sky-700 transition cursor-pointer"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>Confirm Pickup</span>
                                  </button>
                                )}

                                {/* Enter Delivery OTP Button for Traveler */}
                                {req.status === 'accepted' && isPickedUp && !isDelivered && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOtpModalState({
                                        isOpen: true,
                                        requestId: req.id,
                                        deliveryId: delivery?.id,
                                        isTraveler: true,
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                    <span>Enter Delivery OTP</span>
                                  </button>
                                )}

                                {/* Rate Sender Button once completed */}
                                {isDelivered && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRatingModalState({
                                        isOpen: true,
                                        requestId: req.id,
                                        toUserId: req.sender_id,
                                        targetName: req.sender_name,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs cursor-pointer transition"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-current" />
                                    <span>Rate Sender</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No incoming requests yet for this itinerary.</p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Posted on: {new Date(trip.created_at).toLocaleDateString('en-IN')}</span>
                      <span>Trip ID: {trip.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Tab 3: Escrow & Payments */}
        {activeTab === 'payments' && (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Safe-Transit Escrow Guarantee
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Every payment is locked safely in RBI-compliant escrow. Funds are automatically released to the traveler upon delivery code confirmation.
                </p>
              </div>
            </div>

            {payments.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center border border-slate-200/80 bg-white space-y-3">
                <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No Transactions Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When you send a package or deliver one, all escrow receipts and tax invoices appear here.
                </p>
              </div>
            ) : (
              payments.map((p) => (
                <div
                  key={p.id}
                  className="glass-card rounded-2xl p-4 border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900 font-mono">₹{p.amount}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          p.status === 'locked'
                            ? 'bg-amber-100 text-amber-800'
                            : p.status === 'released'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.status === 'locked' ? 'Locked in Escrow' : p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Payment ID: {p.id.slice(0, 12)}... • Request Ref: {p.request_id.slice(0, 8)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/payment/${p.request_id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      View Invoice &amp; Certificate
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* OTP Handshake Modal */}
      <OtpHandshakeModal
        isOpen={otpModalState.isOpen}
        onClose={() => setOtpModalState((prev) => ({ ...prev, isOpen: false }))}
        requestId={otpModalState.requestId}
        deliveryId={otpModalState.deliveryId}
        isTraveler={otpModalState.isTraveler}
        onConfirmed={() => void loadData()}
      />

      {/* Rating & Review Modal */}
      <RatingModal
        isOpen={ratingModalState.isOpen}
        onClose={() => setRatingModalState((prev) => ({ ...prev, isOpen: false }))}
        requestId={ratingModalState.requestId}
        toUserId={ratingModalState.toUserId}
        targetName={ratingModalState.targetName}
        onSubmitted={() => void loadData()}
      />
    </MarketingShell>
  )
}
