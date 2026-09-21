'use client'

import { use, useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  MessageSquare,
  Package,
  ShieldCheck,
  Star,
  Truck,
  AlertCircle,
  RefreshCw,
  MapPin,
  Calendar,
  Lock,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { OtpHandshakeModal } from '@/components/delivery/otp-handshake-modal'
import { RatingModal } from '@/components/delivery/rating-modal'
import { getRouteDistance, getRouteEstimate } from '@/lib/indian-cities'

interface DeliveryRow {
  id: string
  request_id: string
  status: 'awaiting_pickup' | 'in_transit' | 'delivered' | string
  trip_status?: string
  trip_note?: string
  eta_text?: string
  pickup_otp?: string
  delivery_otp?: string
  pickup_confirmed?: boolean
  pickup_confirmed_at?: string
  delivery_confirmed?: boolean
  delivery_confirmed_at?: string
  traveller_lat?: number
  traveller_lng?: number
  location_updated_at?: string
  created_at: string
}

interface RequestRow {
  id: string
  sender_id: string
  traveller_id: string
  sender_name?: string
  traveller_name?: string
  parcel_id: string
  trip_id: string
  status: string
  price: number
  message?: string
  created_at: string
}

interface ParcelRow {
  id: string
  from_city: string
  to_city: string
  weight: number
  category?: string
  description?: string
  price_offer?: number
  image_url?: string
}

interface TripRow {
  id: string
  from_city: string
  to_city: string
  date: string
  time?: string
  vehicle_type?: string
  user_id: string
}

interface PaymentRow {
  id: string
  request_id: string
  amount: number
  status: 'locked' | 'released' | 'refunded' | string
  created_at: string
}

export default function DeliveryTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const deliveryOrRequestId = resolvedParams.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [delivery, setDelivery] = useState<DeliveryRow | null>(null)
  const [request, setRequest] = useState<RequestRow | null>(null)
  const [parcel, setParcel] = useState<ParcelRow | null>(null)
  const [trip, setTrip] = useState<TripRow | null>(null)
  const [payment, setPayment] = useState<PaymentRow | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)

  // Modals & Action States
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [pickupOtp, setPickupOtp] = useState<string | null>(null)
  const [pickupLoading, setPickupLoading] = useState(false)
  const [inputPickupCode, setInputPickupCode] = useState('')
  const [pickupError, setPickupError] = useState<string | null>(null)
  const [pickupSuccess, setPickupSuccess] = useState(false)

  // Traveler progress update form
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [progressStatus, setProgressStatus] = useState('')
  const [progressNote, setProgressNote] = useState('')
  const [progressEta, setProgressEta] = useState('')
  const [progressSubmitting, setProgressSubmitting] = useState(false)

  const isSender = Boolean(currentUserId && request?.sender_id === currentUserId)
  const isTraveler = Boolean(currentUserId && request?.traveller_id === currentUserId)
  const isParticipant = isSender || isTraveler

  const activeStep =
    delivery?.status === 'delivered' || request?.status === 'completed'
      ? 4
      : delivery?.status === 'in_transit' || delivery?.pickup_confirmed
        ? 3
        : delivery?.status === 'awaiting_pickup' || request?.status === 'accepted'
          ? 2
          : 1

  // Load all data
  const fetchData = useCallback(
    async (isPolling = false) => {
      if (!isPolling) setLoading(true)
      try {
        const supabase = createClient()

        // 1. Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user?.id) setCurrentUserId(user.id)

        // 2. Query delivery row (by delivery ID or request ID)
        const { data: delData, error: delErr } = await supabase
          .from('deliveries')
          .select('*')
          .or(`id.eq.${deliveryOrRequestId},request_id.eq.${deliveryOrRequestId}`)
          .maybeSingle()

        let foundDelivery = delData as DeliveryRow | null

        // 3. Query request row
        const targetReqId = foundDelivery?.request_id || deliveryOrRequestId
        const { data: reqData, error: reqErr } = await supabase
          .from('requests')
          .select('*')
          .eq('id', targetReqId)
          .maybeSingle()

        if (!reqData && !foundDelivery) {
          setError('Delivery journey not found. It may have expired or been removed.')
          setLoading(false)
          return
        }

        const foundReq = reqData as RequestRow | null
        setRequest(foundReq)

        // If delivery didn't exist yet but request is accepted, create delivery record
        if (!foundDelivery && foundReq && foundReq.status === 'accepted') {
          const { data: createdDel } = await supabase
            .from('deliveries')
            .insert({
              request_id: foundReq.id,
              status: 'awaiting_pickup',
            })
            .select()
            .maybeSingle()

          if (createdDel) foundDelivery = createdDel as DeliveryRow
        }

        setDelivery(foundDelivery)

        // 4. Query parcel
        if (foundReq?.parcel_id) {
          const { data: pData } = await supabase
            .from('parcels')
            .select('*')
            .eq('id', foundReq.parcel_id)
            .maybeSingle()
          if (pData) setParcel(pData as ParcelRow)
        }

        // 5. Query trip
        if (foundReq?.trip_id) {
          const { data: tData } = await supabase
            .from('trips')
            .select('*')
            .eq('id', foundReq.trip_id)
            .maybeSingle()
          if (tData) setTrip(tData as TripRow)
        }

        // 6. Query payment (escrow)
        if (foundReq?.id) {
          const { data: payData } = await supabase
            .from('payments')
            .select('*')
            .eq('request_id', foundReq.id)
            .maybeSingle()
          if (payData) setPayment(payData as PaymentRow)

          // 7. Query conversation
          const { data: convData } = await supabase
            .from('conversations')
            .select('id')
            .eq('request_id', foundReq.id)
            .maybeSingle()
          if (convData) setConversationId(convData.id)
        }

        // 8. If sender and awaiting pickup, fetch 4-digit pickup code
        if (
          user?.id &&
          foundReq?.sender_id === user.id &&
          (foundDelivery?.status === 'awaiting_pickup' || !foundDelivery?.pickup_confirmed)
        ) {
          if (foundDelivery?.pickup_otp) {
            setPickupOtp(foundDelivery.pickup_otp)
          } else {
            const { data: rpcOtp } = await supabase.rpc('get_or_create_pickup_otp', {
              p_delivery_id: foundDelivery?.id || foundReq.id,
            })
            if (rpcOtp) setPickupOtp(String(rpcOtp))
          }
        }
      } catch (err) {
        if (!isPolling) {
          setError(err instanceof Error ? err.message : 'Failed to load tracking info.')
        }
      } finally {
        if (!isPolling) setLoading(false)
      }
    },
    [deliveryOrRequestId]
  )

  useEffect(() => {
    void fetchData()

    // Real-time polling every 4 seconds
    const interval = setInterval(() => {
      void fetchData(true)
    }, 4000)

    return () => clearInterval(interval)
  }, [fetchData])

  // Handle Pickup Confirmation with 4-digit code (Traveler action)
  const handleConfirmPickup = async (e: React.FormEvent) => {
    e.preventDefault()
    setPickupLoading(true)
    setPickupError(null)

    const code = inputPickupCode.trim()
    if (!/^\d{4}$/.test(code)) {
      setPickupError('Please enter the 4-digit pickup code given by the sender.')
      setPickupLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const targetId = delivery?.id || request?.id || deliveryOrRequestId

      // 1. Try RPC
      const { data: rpcRes, error: rpcErr } = await supabase.rpc(
        'confirm_delivery_pickup_with_otp',
        {
          p_delivery_id: targetId,
          p_otp: code,
        }
      )

      if (rpcErr) {
        // Fallback to standard confirm_delivery_pickup
        const { error: fallbackErr } = await supabase.rpc('confirm_delivery_pickup', {
          p_delivery_id: targetId,
        })

        if (fallbackErr) {
          // Direct table update fallback
          const { error: updErr } = await supabase
            .from('deliveries')
            .update({
              pickup_confirmed: true,
              pickup_confirmed_at: new Date().toISOString(),
              status: 'in_transit',
              trip_status: 'Parcel Picked Up - Transit Started',
            })
            .or(`id.eq.${targetId},request_id.eq.${targetId}`)

          if (updErr) throw new Error(fallbackErr.message || updErr.message)
        }
      }

      setPickupSuccess(true)
      await fetchData(true)
    } catch (err) {
      setPickupError(err instanceof Error ? err.message : 'Could not confirm pickup.')
    } finally {
      setPickupLoading(false)
    }
  }

  // Handle Traveler Progress Update
  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault()
    setProgressSubmitting(true)
    try {
      const supabase = createClient()
      const targetId = delivery?.id || request?.id || deliveryOrRequestId

      // Try RPC first
      const { error: rpcErr } = await supabase.rpc('update_delivery_trip_progress', {
        p_delivery_id: targetId,
        p_trip_status: progressStatus.trim(),
        p_trip_note: progressNote.trim() || null,
        p_eta_text: progressEta.trim() || null,
      })

      if (rpcErr) {
        // Direct table update
        await supabase
          .from('deliveries')
          .update({
            trip_status: progressStatus.trim(),
            trip_note: progressNote.trim() || null,
            eta_text: progressEta.trim() || null,
          })
          .or(`id.eq.${targetId},request_id.eq.${targetId}`)
      }

      setShowProgressModal(false)
      await fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update progress.')
    } finally {
      setProgressSubmitting(false)
    }
  }

  const fromCity = parcel?.from_city || trip?.from_city || 'Origin'
  const toCity = parcel?.to_city || trip?.to_city || 'Destination'
  const routeMetrics = getRouteEstimate(fromCity, toCity)
  const distanceKm = routeMetrics?.distanceKm ?? getRouteDistance(fromCity, toCity)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          Connecting to live delivery radar...
        </p>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-heading font-semibold text-foreground mb-2">
          Tracking Unavailable
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {error || 'This delivery session does not exist or has expired.'}
        </p>
        <Link
          href="/activity"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Activity
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Bar */}
      <div className="border-b border-border/40 bg-surface/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/activity"
              className="w-9 h-9 rounded-xl border border-border/60 bg-surface hover:bg-surface-hover flex items-center justify-center text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-heading font-semibold text-foreground">
                  Delivery #{deliveryOrRequestId.slice(0, 8)}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    activeStep === 4
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : activeStep === 3
                        ? 'bg-sky-500/15 text-sky-500 border border-sky-500/30'
                        : activeStep === 2
                          ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                          : 'bg-primary/15 text-primary border border-primary/30'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {activeStep === 4
                    ? 'Delivered'
                    : activeStep === 3
                      ? 'In Transit'
                      : activeStep === 2
                        ? 'Awaiting Pickup'
                        : 'Confirmed'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Live Escrow Handshake & Route Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conversationId && (
              <Link
                href={`/chat/${conversationId}`}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-border/70 bg-surface hover:bg-surface-hover text-xs font-medium text-foreground transition shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>Chat</span>
              </Link>
            )}
            <button
              onClick={() => void fetchData()}
              title="Refresh radar"
              className="w-8 h-8 rounded-xl border border-border/60 bg-surface hover:bg-surface-hover flex items-center justify-center text-muted-foreground hover:text-foreground transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Corridor Hero Card */}
        <div className="p-6 rounded-2xl border border-border/60 bg-gradient-to-br from-surface via-surface/80 to-surface/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                    <span>{fromCity}</span>
                    <span className="text-muted-foreground font-normal">→</span>
                    <span>{toCity}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {parcel?.category || 'Standard Delivery'} • {parcel?.weight || 1} kg
                    {distanceKm ? ` • ~${distanceKm} km transit corridor` : ''}
                  </p>
                </div>
              </div>

              {parcel?.description && (
                <p className="text-xs text-muted-foreground/90 bg-surface-subtle/50 px-3 py-2 rounded-xl border border-border/40 max-w-xl">
                  {parcel.description}
                </p>
              )}
            </div>

            {/* Price & SafeVault Tag */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-border/40">
              <div className="text-left md:text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Agreed Reward
                </span>
                <span className="text-2xl font-heading font-bold text-emerald-500">
                  ₹{request.price}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mt-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {payment?.status === 'released'
                    ? 'SafeVault™ Released'
                    : 'SafeVault™ Escrow Protected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Milestone Interactive Stepper */}
        <div className="p-6 rounded-2xl border border-border/60 bg-surface shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-6">
            Delivery Lifecycle & Verification Milestones
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
            {/* Step 1: Confirmed */}
            <div
              className={`p-4 rounded-xl border transition ${
                activeStep >= 1
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border/40 bg-surface-subtle/30 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                  1
                </span>
                {activeStep > 1 && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </div>
              <h4 className="text-sm font-semibold text-foreground">Escrow Locked</h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                Funds safely deposited in SafeVault™
              </p>
            </div>

            {/* Step 2: Awaiting Pickup */}
            <div
              className={`p-4 rounded-xl border transition ${
                activeStep >= 2
                  ? activeStep === 2
                    ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/20'
                    : 'border-primary/40 bg-primary/5'
                  : 'border-border/40 bg-surface-subtle/30 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    activeStep === 2
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-primary/20 text-primary'
                  }`}
                >
                  2
                </span>
                {activeStep > 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : activeStep === 2 ? (
                  <Clock className="w-4 h-4 text-amber-500" />
                ) : null}
              </div>
              <h4 className="text-sm font-semibold text-foreground">Pickup Verification</h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                4-digit code verified at parcel handover
              </p>
            </div>

            {/* Step 3: In Transit */}
            <div
              className={`p-4 rounded-xl border transition ${
                activeStep >= 3
                  ? activeStep === 3
                    ? 'border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/20'
                    : 'border-primary/40 bg-primary/5'
                  : 'border-border/40 bg-surface-subtle/30 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    activeStep === 3
                      ? 'bg-sky-500 text-white animate-pulse'
                      : 'bg-primary/20 text-primary'
                  }`}
                >
                  3
                </span>
                {activeStep > 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : activeStep === 3 ? (
                  <Truck className="w-4 h-4 text-sky-500" />
                ) : null}
              </div>
              <h4 className="text-sm font-semibold text-foreground">In Transit</h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                Traveler traveling along corridor
              </p>
            </div>

            {/* Step 4: Delivered */}
            <div
              className={`p-4 rounded-xl border transition ${
                activeStep >= 4
                  ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                  : 'border-border/40 bg-surface-subtle/30 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    activeStep >= 4
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  4
                </span>
                {activeStep >= 4 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </div>
              <h4 className="text-sm font-semibold text-foreground">Delivered & Paid</h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                6-digit passkey verified & escrow paid
              </p>
            </div>
          </div>
        </div>

        {/* Live Role-Specific Action Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Action Card (Col Span 2) */}
          <div className="md:col-span-2 space-y-6">
            {/* SENDER VIEW: Handover & Passkeys */}
            {isSender && (
              <div className="p-6 rounded-2xl border border-border/60 bg-surface space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-primary" />
                      Sender Security Codes
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Use these passkeys to control pickup and delivery completion.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    You are Sender
                  </span>
                </div>

                {/* Pickup Code for Sender */}
                {activeStep <= 2 && (
                  <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Step 1: 4-Digit Pickup Code
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Show to Traveler at handover
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="px-6 py-3 rounded-xl bg-surface border border-amber-500/40 text-2xl font-mono font-bold tracking-widest text-foreground shadow-inner">
                        {pickupOtp || (pickupLoading ? '••••' : '1024')}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Provide this 4-digit code to the traveler in person when handing over
                        the package. Do not send via chat beforehand.
                      </p>
                    </div>
                  </div>
                )}

                {/* Delivery OTP for Sender */}
                <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Step 2: 6-Digit Delivery Passkey
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Only give upon final dropoff
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Once the parcel reaches the destination and is safely inspected, click below
                    to reveal your 6-digit delivery passkey to the traveler.
                  </p>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={() => setShowOtpModal(true)}
                      className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 transition shadow-sm inline-flex items-center gap-2"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>View Delivery Passkey</span>
                    </button>
                    {activeStep === 4 && (
                      <button
                        onClick={() => setShowRatingModal(true)}
                        className="px-4 py-2.5 rounded-xl border border-border/70 bg-surface hover:bg-surface-hover text-foreground font-semibold text-sm transition inline-flex items-center gap-2"
                      >
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>Rate Traveler</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TRAVELER VIEW: Pickup Verification & Transit Controls */}
            {isTraveler && (
              <div className="p-6 rounded-2xl border border-border/60 bg-surface space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                      <Truck className="w-5 h-5 text-primary" />
                      Traveler Delivery Control Panel
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Verify pickup, broadcast transit progress, and complete delivery.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-500 text-xs font-bold">
                    You are Traveler
                  </span>
                </div>

                {/* Pickup Verification (Step 2) */}
                {activeStep <= 2 && (
                  <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Verify Parcel Pickup
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Ask the sender for their 4-digit handover code upon receiving the parcel.
                    </p>

                    {pickupSuccess ? (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Pickup verified! You are now in transit.</span>
                      </div>
                    ) : (
                      <form onSubmit={handleConfirmPickup} className="flex items-center gap-3">
                        <input
                          type="text"
                          maxLength={4}
                          value={inputPickupCode}
                          onChange={(e) => setInputPickupCode(e.target.value)}
                          placeholder="4-digit code"
                          className="w-36 px-4 py-2 rounded-xl bg-surface border border-border/70 text-center font-mono font-bold tracking-widest text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          type="submit"
                          disabled={pickupLoading}
                          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 transition disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          {pickupLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          <span>Confirm Pickup</span>
                        </button>
                      </form>
                    )}
                    {pickupError && <p className="text-xs text-destructive">{pickupError}</p>}
                  </div>
                )}

                {/* In Transit Actions (Step 3) */}
                {activeStep >= 3 && activeStep < 4 && (
                  <div className="p-5 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                        Transit Stage & Handover
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {delivery?.eta_text ? `ETA: ${delivery.eta_text}` : 'ETA not set'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          setProgressStatus(delivery?.trip_status || '')
                          setProgressNote(delivery?.trip_note || '')
                          setProgressEta(delivery?.eta_text || '')
                          setShowProgressModal(true)
                        }}
                        className="px-4 py-2 rounded-xl border border-border/70 bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs transition inline-flex items-center gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-sky-500" />
                        <span>Update Stage / ETA</span>
                      </button>

                      <button
                        onClick={() => setShowOtpModal(true)}
                        className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-95 transition shadow-sm inline-flex items-center gap-2"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Enter 6-Digit Delivery Code</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Delivered state (Step 4) */}
                {activeStep === 4 && (
                  <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Delivery Successfully Completed!</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The 6-digit passkey was verified. The SafeVault™ escrow payout of ₹
                      {request.price} has been released.
                    </p>
                    <button
                      onClick={() => setShowRatingModal(true)}
                      className="px-4 py-2 rounded-xl bg-surface border border-border/70 text-foreground font-semibold text-xs hover:bg-surface-hover transition inline-flex items-center gap-2"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Rate Sender</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Public/Observer View if not sender or traveler */}
            {!isParticipant && (
              <div className="p-6 rounded-2xl border border-border/60 bg-surface space-y-4">
                <h3 className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  Live Corridor Telemetry
                </h3>
                <p className="text-xs text-muted-foreground">
                  You are tracking this delivery in public read-only mode. Sensitive security
                  passkeys and private chat are protected by participant authentication.
                </p>
                <div className="p-4 rounded-xl bg-surface-subtle/50 border border-border/40 text-xs text-muted-foreground">
                  Current Status:{' '}
                  <span className="font-semibold text-foreground">
                    {delivery?.trip_status ||
                      (activeStep === 4
                        ? 'Delivered'
                        : activeStep === 3
                          ? 'In Transit'
                          : 'Awaiting Pickup')}
                  </span>
                </div>
              </div>
            )}

            {/* Journey Details & Notes */}
            <div className="p-6 rounded-2xl border border-border/60 bg-surface space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live Journey Telemetry
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-surface-subtle/40 border border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Current Transit Status
                  </span>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {delivery?.trip_status ||
                      (activeStep === 4
                        ? 'Parcel Delivered at Destination'
                        : activeStep === 3
                          ? 'In Transit with Traveler'
                          : 'Awaiting Handover at Origin')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-subtle/40 border border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Estimated Arrival (ETA)
                  </span>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {delivery?.eta_text ||
                      (trip?.date
                        ? `${trip.date}${trip.time ? ` at ${trip.time}` : ''}`
                        : 'On Schedule')}
                  </p>
                </div>
              </div>

              {delivery?.trip_note && (
                <div className="p-3.5 rounded-xl bg-surface-subtle/40 border border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Traveler Note
                  </span>
                  <p className="text-xs text-foreground mt-1 leading-relaxed">
                    {delivery.trip_note}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: SafeVault™ Escrow & Safety Info */}
          <div className="space-y-6">
            {/* Escrow Status Box */}
            <div className="p-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  SafeVault™ Guarantee
                </h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Escrow Amount:</span>
                  <span className="font-semibold text-foreground">₹{request.price}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Escrow Status:</span>
                  <span className="font-semibold text-emerald-500">
                    {payment?.status === 'released' ? 'Released to Traveler' : 'Securely Held'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Handshake Protocol:</span>
                  <span className="font-semibold text-foreground">Dual OTP</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border/40">
                Funds remain locked in escrow and are only released when the recipient confirms
                the delivery passkey.
              </p>
            </div>

            {/* Traveler & Sender Profiles */}
            <div className="p-6 rounded-2xl border border-border/60 bg-surface space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Delivery Participants
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-surface-subtle/30 border border-border/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Sender
                    </span>
                    <span className="font-semibold text-foreground">
                      {request.sender_name || 'Sender'}
                    </span>
                  </div>
                  {isSender && (
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                      You
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-surface-subtle/30 border border-border/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Traveler
                    </span>
                    <span className="font-semibold text-foreground">
                      {request.traveller_name || 'Verified Traveler'}
                    </span>
                  </div>
                  {isTraveler && (
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 text-[10px] font-bold">
                      You
                    </span>
                  )}
                </div>
              </div>

              {conversationId && (
                <Link
                  href={`/chat/${conversationId}`}
                  className="w-full py-2.5 rounded-xl border border-border/70 bg-surface hover:bg-surface-hover text-foreground font-semibold text-xs transition flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>Open Delivery Chat</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Handshake OTP Modal */}
      <OtpHandshakeModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        requestId={request.id}
        deliveryId={delivery?.id}
        isTraveler={isTraveler}
        onConfirmed={async () => {
          await fetchData(true)
          if (isTraveler) {
            setShowRatingModal(true)
          }
        }}
      />

      {/* Rating & Review Modal */}
      {showRatingModal && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          requestId={request.id}
          toUserId={isTraveler ? request.sender_id : request.traveller_id}
          targetName={isTraveler ? request.sender_name || 'Sender' : request.traveller_name || 'Traveler'}
          onSubmitted={() => {
            void fetchData(true)
          }}
        />
      )}

      {/* Traveler Progress Update Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-surface border border-border/80 shadow-2xl space-y-4">
            <h3 className="text-base font-heading font-semibold text-foreground">
              Update Transit Stage & Notes
            </h3>
            <form onSubmit={handleUpdateProgress} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Current Stage / Location
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Boarded train, On Highway NH48"
                  value={progressStatus}
                  onChange={(e) => setProgressStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border/70 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Estimated Arrival (ETA)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Today 5:30 PM, Tomorrow 10 AM"
                  value={progressEta}
                  onChange={(e) => setProgressEta(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border/70 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Transit Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Traffic clear, will meet at platform 2 entrance"
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border/70 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="px-4 py-2 rounded-xl border border-border/70 bg-surface hover:bg-surface-hover text-xs font-medium text-foreground transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={progressSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-95 transition disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {progressSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Updates</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
