'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Car,
  Clock,
  Navigation,
  Plane,
  Sparkles,
  Train,
  CheckCircle2,
} from 'lucide-react'

export type TripPreview = {
  id: string
  from_city: string
  to_city: string
  date: string
  vehicle_type: string
  available_capacity: number
  price_per_kg: number
  user_name: string | null
}

interface Props {
  trips: TripPreview[]
}

const VEHICLE_FILTERS = [
  { id: 'all', label: 'All Corridors', icon: null },
  { id: 'car', label: 'Intercity Road', icon: Car },
  { id: 'train', label: 'Express Rail', icon: Train },
  { id: 'flight', label: 'Flight Courier', icon: Plane },
]

export function CorridorsMarketplace({ trips }: Props) {
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all')

  const filteredTrips = trips.filter((trip) => {
    if (selectedVehicle === 'all') return true
    return trip.vehicle_type?.toLowerCase() === selectedVehicle
  })

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            <span>Live Travel Network</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Curated Travel Pathways
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Verified travel companions departing today with available luggage or trunk space.
          </p>
        </div>

        {/* Vehicle Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 overflow-x-auto no-scrollbar">
          {VEHICLE_FILTERS.map((filter) => {
            const Icon = filter.icon
            const active = selectedVehicle === filter.id
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedVehicle(filter.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{filter.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Trips Grid */}
      {filteredTrips.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredTrips.map((trip) => {
            const isCar = trip.vehicle_type?.toLowerCase() === 'car'
            const isFlight = trip.vehicle_type?.toLowerCase() === 'flight'
            const VehicleIcon = isFlight ? Plane : isCar ? Car : Train

            return (
              <div
                key={trip.id}
                className="boarding-pass-card p-5 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Header with Vehicle Badge & Capacity */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-1 rounded-xl font-bold bg-slate-100 text-slate-700 capitalize flex items-center gap-1.5">
                      <VehicleIcon className="w-3.5 h-3.5 text-emerald-600" />
                      {trip.vehicle_type || 'Car'}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {trip.available_capacity} kg space
                    </span>
                  </div>

                  {/* Route Cities */}
                  <div>
                    <div className="text-base font-heading font-bold text-slate-900 flex items-center gap-2">
                      <span className="truncate">{trip.from_city}</span>
                      <span className="text-emerald-600 font-bold shrink-0">→</span>
                      <span className="truncate">{trip.to_city}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-sky-600" />
                      <span>{trip.date}</span>
                    </p>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Luggage Meter</span>
                      <span className="text-slate-800 font-mono font-bold">
                        {trip.available_capacity} kg open
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${Math.min(100, (trip.available_capacity / 15) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Rate */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">Carrier fee:</span>
                    <span className="font-heading font-extrabold text-slate-900 text-base">
                      ₹{trip.price_per_kg}
                      <span className="text-[10px] text-slate-500 font-normal">/kg</span>
                    </span>
                  </div>
                </div>

                <div className="pt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/search?from=${encodeURIComponent(trip.from_city)}&to=${encodeURIComponent(
                      trip.to_city
                    )}&type=trips`}
                    className="inline-flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white group-hover:bg-emerald-600 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <span>Match</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  <Link
                    href={`/create-parcel?from=${encodeURIComponent(
                      trip.from_city
                    )}&to=${encodeURIComponent(trip.to_city)}`}
                    className="inline-flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer border border-slate-200 active:scale-95"
                  >
                    <span>Send</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-8 text-center max-w-lg mx-auto space-y-3">
          <p className="text-sm font-semibold text-slate-800">
            No journeys listed under {selectedVehicle === 'all' ? 'any corridor' : selectedVehicle} right now.
          </p>
          <p className="text-xs text-slate-500">
            Be the first traveler to list a journey along this route, or post a parcel request.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/create-trip"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              Create a Trip
            </Link>
            <Link
              href="/create-parcel"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Send a Parcel
            </Link>
          </div>
        </div>
      )}

      {/* Explore All Link */}
      <div className="text-center pt-2">
        <Link
          href="/search"
          className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition py-1 px-3 rounded-full bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100/80"
        >
          <span>Explore All 150+ Nationwide Routes</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
