'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Plane,
  ShieldCheck,
  Sparkles,
  Star,
  Train,
  Truck,
  User,
} from 'lucide-react'

export interface FeedTrip {
  id: string
  from_city: string
  to_city: string
  date: string
  time?: string
  vehicle_type: string
  available_capacity: number
  price_per_kg: number
  user_name: string | null
  user_rating?: number
  is_verified?: boolean
}

export interface FeedParcel {
  id: string
  from_city: string
  to_city: string
  delivery_date?: string
  weight: number
  category?: string
  description?: string
  price_offer?: number
  user_name: string | null
  user_rating?: number
  is_verified?: boolean
}

interface AppMarketplaceFeedProps {
  initialTrips: FeedTrip[]
  initialParcels?: FeedParcel[]
}

const VEHICLE_META: Record<
  string,
  { label: string; icon: typeof Car; color: string; bg: string; border: string }
> = {
  car: { label: 'CAR', icon: Car, color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' },
  flight: { label: 'FLIGHT', icon: Plane, color: '#104BB9', bg: '#EEF4FF', border: '#DBE8FD' },
  train: { label: 'TRAIN', icon: Train, color: '#0D9488', bg: '#CCFBF1', border: '#99F6E4' },
  bus: { label: 'BUS', icon: Truck, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
}

const CATEGORY_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  documents: { label: 'Documents', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  electronics: { label: 'Electronics', color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' },
  clothing: { label: 'Clothing', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  food: { label: 'Food & Sweets', color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' },
  medicine: { label: 'Medicine', color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
  other: { label: 'General Goods', color: '#104BB9', bg: '#EEF4FF', border: '#DBE8FD' },
}

export function AppMarketplaceFeed({ initialTrips, initialParcels = [] }: AppMarketplaceFeedProps) {
  const [activeTab, setActiveTab] = useState<'trips' | 'parcels'>('trips')
  const [vehicleFilter, setVehicleFilter] = useState<string>('all')

  const filteredTrips = initialTrips.filter((trip) => {
    if (vehicleFilter === 'all') return true
    return trip.vehicle_type?.toLowerCase() === vehicleFilter.toLowerCase()
  })

  return (
    <section className="w-full space-y-6">
      {/* Tab Switcher matching Mobile LiveMarketplaceHeader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200/90 max-w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('trips')}
            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'trips' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {activeTab === 'trips' && (
              <motion.span
                layoutId="feedActiveTab"
                className="absolute inset-0 rounded-xl bg-[#004AAD]"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Plane className="relative z-10 w-4 h-4" />
            <span className="relative z-10">Trips Available</span>
            <span className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === 'trips' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {filteredTrips.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('parcels')}
            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'parcels' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {activeTab === 'parcels' && (
              <motion.span
                layoutId="feedActiveTab"
                className="absolute inset-0 rounded-xl bg-[#004AAD]"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Package className="relative z-10 w-4 h-4" />
            <span className="relative z-10">Parcels Waiting</span>
            <span className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === 'parcels' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {initialParcels.length}
            </span>
          </button>
        </div>

        {/* Quick Corridor Filter Pills */}
        {activeTab === 'trips' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {['all', 'car', 'train', 'flight', 'bus'].map((vKey) => {
              const active = vehicleFilter === vKey
              return (
                <button
                  key={vKey}
                  type="button"
                  onClick={() => setVehicleFilter(vKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer border ${
                    active
                      ? 'bg-[#EEF5FF] text-[#004AAD] border-[#BBD8FF] shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {vKey === 'all' ? 'All Corridors' : vKey}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Feed Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'trips' ? (
          <motion.div
            key="trips-feed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {filteredTrips.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTrips.map((trip) => {
                  const vMeta =
                    VEHICLE_META[trip.vehicle_type?.toLowerCase() || 'car'] || VEHICLE_META.car
                  const VIcon = vMeta.icon

                  return (
                    <div
                      key={trip.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-[#004AAD]/40 transition-all flex flex-col justify-between group"
                    >
                      {/* Top Row: User Avatar & Vehicle Pill */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-[#004AAD] uppercase">
                              {(trip.user_name || 'U').slice(0, 2)}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#008B48] border-2 border-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                                {trip.user_name || 'Traveler'}
                              </span>
                              <BadgeCheck className="w-3.5 h-3.5 text-[#008B48] shrink-0" />
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                              <span className="font-semibold text-slate-700">
                                {trip.user_rating ? trip.user_rating.toFixed(1) : '5.0'}
                              </span>
                              <span>• Verified</span>
                            </div>
                          </div>
                        </div>

                        {/* Vehicle Pill */}
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border"
                          style={{
                            color: vMeta.color,
                            backgroundColor: vMeta.bg,
                            borderColor: vMeta.border,
                          }}
                        >
                          <VIcon className="w-3.5 h-3.5" />
                          {vMeta.label}
                        </span>
                      </div>

                      {/* Route Corridor */}
                      <div className="space-y-2 mb-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-sm font-heading font-bold text-slate-900">
                          <span className="truncate">{trip.from_city}</span>
                          <span className="text-[#004AAD] font-bold mx-2">→</span>
                          <span className="truncate">{trip.to_city}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{trip.date}</span>
                          {trip.time && (
                            <>
                              <span>•</span>
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{trip.time}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Luggage Meter & Pricing Strip */}
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Luggage Capacity</span>
                            <span className="font-bold text-slate-800">
                              {trip.available_capacity} kg available
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#008B48]"
                              style={{
                                width: `${Math.min(100, (trip.available_capacity / 15) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                              Delivery Rate
                            </span>
                            <span className="text-lg font-heading font-extrabold text-[#008B48]">
                              ₹{trip.price_per_kg}
                              <span className="text-xs font-normal text-slate-500"> /kg</span>
                            </span>
                          </div>

                          <Link
                            href={`/create-parcel?from=${encodeURIComponent(
                              trip.from_city
                            )}&to=${encodeURIComponent(trip.to_city)}`}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#004AAD] hover:bg-[#003580] text-white shadow-xs transition-all active:scale-95 inline-flex items-center gap-1"
                          >
                            <span>Request</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center max-w-md mx-auto space-y-3">
                <Plane className="w-8 h-8 text-[#004AAD] mx-auto opacity-40" />
                <h4 className="text-sm font-bold text-slate-800">No trips along this filter</h4>
                <p className="text-xs text-slate-500">
                  Be the first traveler to post a journey or post your parcel to get matched.
                </p>
                <Link
                  href="/create-trip"
                  className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-[#004AAD] text-white"
                >
                  Post a Trip
                </Link>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="parcels-feed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {initialParcels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {initialParcels.map((parcel) => {
                  const cMeta =
                    CATEGORY_META[parcel.category?.toLowerCase() || 'other'] || CATEGORY_META.other

                  return (
                    <div
                      key={parcel.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-[#004AAD]/40 transition-all flex flex-col justify-between group"
                    >
                      {/* Top Row: Sender Info & Category */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-[#004AAD] uppercase">
                            {(parcel.user_name || 'S').slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                                {parcel.user_name || 'Sender'}
                              </span>
                              <BadgeCheck className="w-3.5 h-3.5 text-[#008B48] shrink-0" />
                            </div>
                            <span className="text-[11px] text-slate-500">Verified Sender</span>
                          </div>
                        </div>

                        <span
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold border"
                          style={{
                            color: cMeta.color,
                            backgroundColor: cMeta.bg,
                            borderColor: cMeta.border,
                          }}
                        >
                          {cMeta.label}
                        </span>
                      </div>

                      {/* Route Corridor */}
                      <div className="space-y-2 mb-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-sm font-heading font-bold text-slate-900">
                          <span className="truncate">{parcel.from_city}</span>
                          <span className="text-[#004AAD] font-bold mx-2">→</span>
                          <span className="truncate">{parcel.to_city}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Weight: {parcel.weight} kg</span>
                          {parcel.delivery_date && <span>By: {parcel.delivery_date}</span>}
                        </div>
                      </div>

                      {parcel.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 mb-4">
                          {parcel.description}
                        </p>
                      )}

                      {/* Reward Offer & Action */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                            Reward Offer
                          </span>
                          <span className="text-lg font-heading font-extrabold text-[#008B48]">
                            ₹{parcel.price_offer || 250}
                          </span>
                        </div>

                        <Link
                          href={`/create-trip?from=${encodeURIComponent(
                            parcel.from_city
                          )}&to=${encodeURIComponent(parcel.to_city)}`}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#004AAD] hover:bg-[#003580] text-white shadow-xs transition-all active:scale-95 inline-flex items-center gap-1"
                        >
                          <span>Carry</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center max-w-md mx-auto space-y-3">
                <Package className="w-8 h-8 text-[#004AAD] mx-auto opacity-40" />
                <h4 className="text-sm font-bold text-slate-800">No parcels waiting</h4>
                <p className="text-xs text-slate-500">
                  Send a parcel now and travelers heading your way will receive an instant alert.
                </p>
                <Link
                  href="/create-parcel"
                  className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-[#004AAD] text-white"
                >
                  Send a Parcel
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

