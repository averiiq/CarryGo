'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ChevronDown,
  Menu,
  PackageSearch,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react'
import { primaryNavLinks, secondaryNavLinks } from '@/components/marketing/site-data'
import ThemeToggle from '@/components/ThemeToggle'
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
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl transition-colors">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Brand Logo */}
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/30 bg-primary-subtle text-primary transition-transform group-hover:scale-105 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-heading font-extrabold tracking-tight text-foreground">
                CarryGo<span className="text-primary">.</span>
              </span>
              <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-subtle text-primary border border-primary/20">
                P2P Delivery
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main Navigation">
            {primaryNavLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted transition-all hover:bg-primary-subtle/50 hover:text-foreground active:scale-95"
              >
                {item.label}
              </Link>
            ))}

            {/* "More" Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-muted transition-all hover:bg-primary-subtle/50 hover:text-foreground cursor-pointer"
                aria-expanded={moreOpen}
              >
                <span>More</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 rounded-2xl border border-border bg-surface shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1.5">
                    Platform & Company
                  </div>
                  {secondaryNavLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-primary-subtle hover:text-primary transition"
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
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-surface text-muted hover:text-foreground hover:border-primary/40 transition cursor-pointer"
              title="Track Parcel Status"
            >
              <PackageSearch className="h-3.5 w-3.5 text-primary" />
              <span className="hidden md:inline">Track Parcel</span>
            </button>

            {/* Dark / Light Mode Switcher */}
            <ThemeToggle />

            {/* Primary Action Button */}
            <Link
              href="/create-parcel"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow-md transition active:scale-95 cursor-pointer"
            >
              <span>Send Parcel</span>
              <ArrowRight className="h-3.5 w-3.5 hidden sm:inline" />
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="p-2 rounded-xl border border-border bg-surface text-foreground lg:hidden cursor-pointer"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Menu */}
        {menuOpen && (
          <div className="border-t border-border/80 bg-surface/98 backdrop-blur-xl px-4 py-5 lg:hidden animate-in slide-in-from-top-3 duration-200">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  Main Services
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {primaryNavLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  Discover More
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {secondaryNavLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl px-3 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-elevated transition"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setTrackingOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary py-2 px-3 rounded-xl bg-primary-subtle"
                >
                  <PackageSearch className="h-4 w-4" />
                  <span>Track Parcel ID</span>
                </button>
                <Link
                  href="/create-trip"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground py-2 px-3 rounded-xl border border-border"
                >
                  <Sparkles className="h-3.5 w-3.5 text-warning" />
                  <span>Travel & Earn</span>
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
