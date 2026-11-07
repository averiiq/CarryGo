'use client'

import Link from 'next/link'
import {
  ArrowUpRight,
  Filter,
  Navigation,
  Package,
  Plane,
  Search,
  Sparkles,
  Truck,
} from 'lucide-react'

interface QuickActionsProps {
  onSearchClick?: () => void
}

export function AppQuickActions({ onSearchClick }: QuickActionsProps) {
  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* Search Bar Trigger matching Mobile App SearchBarTrigger */}
      <div className="flex items-center gap-2">
        <Link
          href="/search"
          onClick={onSearchClick}
          className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:border-[#004AAD]/50 transition-all group active:scale-[0.985]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#EEF5FF] text-[#004AAD] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Search className="w-4 h-4" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-slate-800">
              Search routes or cities
            </p>
            <p className="text-xs text-slate-400">
              e.g. Gurugram to Panipat, Delhi-NCR, Chandigarh
            </p>
          </div>
        </Link>

        <Link
          href="/search"
          aria-label="Filter routes"
          className="w-12 h-12 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.04)] flex items-center justify-center text-slate-600 hover:text-[#004AAD] hover:border-[#004AAD]/50 transition-all active:scale-95 shrink-0"
        >
          <Filter className="w-5 h-5" />
        </Link>
      </div>

      {/* Quick Action Tiles matching Mobile App QuickActions */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Send Parcel Tile */}
        <Link
          href="/create-parcel"
          className="relative p-4 rounded-2xl bg-[#EEF5FF] border border-[#BBD8FF] shadow-[0_2px_8px_rgba(0,74,173,0.06)] hover:shadow-md hover:border-[#004AAD]/60 transition-all active:scale-[0.978] group overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#004AAD] text-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,74,173,0.3)] group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <div className="w-7 h-7 rounded-full bg-white text-[#004AAD] flex items-center justify-center shadow-xs">
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-heading font-bold text-slate-900 group-hover:text-[#004AAD] transition-colors">
              Send Parcel
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Get items delivered fast
            </p>
          </div>
        </Link>

        {/* Post a Trip Tile */}
        <Link
          href="/create-trip"
          className="relative p-4 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-[#004AAD]/50 transition-all active:scale-[0.978] group overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#004AAD] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plane className="w-5 h-5" />
            </div>
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shadow-xs">
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-heading font-bold text-slate-900 group-hover:text-[#004AAD] transition-colors">
              Post a Trip
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Earn cash while traveling
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}

