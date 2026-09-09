'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ChevronDown,
  Menu,
  Navigation,
  PackageSearch,
  Plane,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { primaryNavLinks, secondaryNavLinks } from '@/components/marketing/site-data'
import { TrackingLookupModal } from '@/components/marketing/tracking-lookup-modal'

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-xs transition-colors">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Brand Logo */}
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105 shadow-xs">
              <Navigation className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-heading font-extrabold tracking-tight text-slate-900">
                CarryGo<span className="text-emerald-600">.</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Peer-to-Peer
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main Navigation">
            {primaryNavLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100/80 hover:text-slate-900 active:scale-95"
              >
                {item.label}
              </Link>
            ))}

            {/* "More" Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100/80 hover:text-slate-900 cursor-pointer"
                aria-expanded={moreOpen}
              >
                <span>More</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                    Platform &amp; Legal
                  </div>
                  {secondaryNavLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Track Button */}
            <button
              type="button"
              onClick={() => setTrackingOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs transition cursor-pointer shrink-0"
              title="Track Parcel Status"
            >
              <PackageSearch className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Track Parcel</span>
            </button>

            {/* Primary Action Button */}
            <Link
              href="/create-parcel"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-105 shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>Send<span className="hidden min-[360px]:inline"> Parcel</span></span>
              <ArrowRight className="h-3.5 w-3.5 hidden sm:inline" />
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden cursor-pointer shrink-0"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Menu */}
        {menuOpen && (
          <div className="border-t border-slate-200 bg-white/98 backdrop-blur-xl px-4 py-5 lg:hidden animate-in slide-in-from-top-3 duration-200">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Main Services
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {primaryNavLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Discover More
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {secondaryNavLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setTrackingOpen(true)
                  }}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 py-2.5 px-3.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  <PackageSearch className="h-4 w-4" />
                  <span>Track Parcel ID</span>
                </button>
                <Link
                  href="/create-trip"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 py-2.5 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition"
                >
                  <Plane className="h-3.5 w-3.5 text-sky-600" />
                  <span>Travel &amp; Earn</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Tracking Lookup Modal */}
      <TrackingLookupModal isOpen={trackingOpen} onClose={() => setTrackingOpen(false)} />
    </>
  )
}
