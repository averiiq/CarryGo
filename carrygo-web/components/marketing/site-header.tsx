'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowRight,
  ChevronDown,
  Compass,
  FileText,
  HelpCircle,
  KeyRound,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Navigation,
  Package,
  PackageSearch,
  Plane,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { primaryNavLinks, secondaryNavLinks } from '@/components/marketing/site-data'
import { TrackingLookupModal } from '@/components/marketing/tracking-lookup-modal'
import { createClient } from '@/utils/supabase/client'
import { logout } from '@/app/login/actions'

import { ScrollProgressBar } from '@/components/marketing/parallax-wrapper'

interface AuthUser {
  id: string
  email?: string
  name?: string
  isKycVerified?: boolean
  isAdmin?: boolean
}

export function SiteHeader() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, is_verified, kyc_status, system_role')
          .eq('id', user.id)
          .maybeSingle()

        setCurrentUser({
          id: user.id,
          email: user.email,
          name: profile?.full_name || (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User',
          isKycVerified: profile?.is_verified || profile?.kyc_status === 'approved',
          isAdmin: profile?.system_role === 'admin',
        })
      } else {
        setCurrentUser(null)
      }
    }

    void checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void checkUser()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false)
    setMoreOpen(false)
  }, [pathname])

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-200 ${
          isScrolled
            ? 'border-b border-slate-200/90 bg-white/95 backdrop-blur-xl'
            : 'border-b border-slate-200/60 bg-white/85 backdrop-blur-md'
        }`}
      >
        <ScrollProgressBar className="absolute top-0 left-0 right-0 h-[2.5px]" />
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white transition-transform group-hover:scale-105 shadow-xs">
                <Navigation className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-heading font-extrabold tracking-tight text-slate-900">
                  CarryGo<span className="text-emerald-600">.</span>
                </span>
                <span className="hidden min-[420px]:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/70">
                  Peer-to-Peer
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
              {primaryNavLinks.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}

              {/* "More" Mega Dropdown Menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    moreOpen
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  aria-expanded={moreOpen}
                >
                  <span>Explore</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
                </button>

                {moreOpen && (
                  <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 pb-1">
                          Platform Features
                        </div>
                        <div className="space-y-0.5">
                          <Link
                            href="/matching"
                            onClick={() => setMoreOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                          >
                            <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <div>
                              <div className="font-semibold">Smart Matching</div>
                              <div className="text-[10px] text-slate-500">Instant carrier route algorithm</div>
                            </div>
                          </Link>
                          <Link
                            href="/pricing"
                            onClick={() => setMoreOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <div>
                              <div className="font-semibold">Transparent Pricing</div>
                              <div className="text-[10px] text-slate-500">60% cheaper than traditional couriers</div>
                            </div>
                          </Link>
                          <Link
                            href="/safety"
                            onClick={() => setMoreOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <div>
                              <div className="font-semibold">SafeVault™ &amp; Security</div>
                              <div className="text-[10px] text-slate-500">Govt. KYC &amp; Dual Golden Passkey</div>
                            </div>
                          </Link>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 pb-1">
                          Guides &amp; Company
                        </div>
                        <div className="grid grid-cols-2 gap-0.5">
                          <Link
                            href="/for-senders"
                            onClick={() => setMoreOpen(false)}
                            className="rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                          >
                            For Senders
                          </Link>
                          <Link
                            href="/for-travelers"
                            onClick={() => setMoreOpen(false)}
                            className="rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                          >
                            For Travelers
                          </Link>
                          <Link
                            href="/about"
                            onClick={() => setMoreOpen(false)}
                            className="rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                          >
                            About Us
                          </Link>
                          <Link
                            href="/faq"
                            onClick={() => setMoreOpen(false)}
                            className="rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                          >
                            FAQ
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right-Side Action Hub */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Track Button */}
            <button
              type="button"
              onClick={() => setTrackingOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 transition-colors cursor-pointer shrink-0"
              title="Track Parcel Status"
            >
              <PackageSearch className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Track</span>
            </button>

            {/* Admin CMS Indicator */}
            {currentUser?.isAdmin && (
              <a
                href={process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001/dashboard'}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs"
                title="Open Admin Operations CMS"
              >
                <Terminal className="w-3 h-3 text-emerald-700" />
                <span>Admin CMS</span>
              </a>
            )}

            {currentUser ? (
              /* User Menu Dropdown */
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-[11px]">
                    {currentUser.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 max-w-[85px] truncate hidden min-[480px]:inline">
                    {currentUser.name}
                  </span>
                  {currentUser.isKycVerified && (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      <div className="mt-1.5">
                        {currentUser.isKycVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" /> KYC Verified
                          </span>
                        ) : (
                          <Link
                            href="/kyc"
                            onClick={() => setUserMenuOpen(false)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100 transition"
                          >
                            <ShieldAlert className="w-3 h-3" /> Verify KYC Now
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      {currentUser.isAdmin && (
                        <a
                          href={process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001/dashboard'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-900 bg-slate-100 rounded-xl hover:bg-slate-200 transition mb-1"
                        >
                          <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Admin CMS Command ↗</span>
                        </a>
                      )}

                      <Link
                        href="/activity"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition"
                      >
                        <Package className="w-3.5 h-3.5 text-emerald-600" />
                        <span>My Deliveries &amp; Trips</span>
                      </Link>

                      <Link
                        href="/chat"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                        <span>Messages</span>
                      </Link>

                      <Link
                        href="/kyc"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>KYC Verification</span>
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition"
                      >
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>Profile &amp; Settings</span>
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setUserMenuOpen(false)
                          await logout()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 rounded-xl hover:bg-rose-50 transition cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Sign In Button - tucked into mobile menu for narrow screens */
              <Link
                href="/login"
                className="hidden min-[480px]:inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Primary Action Button */}
            <Link
              href="/create-parcel"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-full bg-emerald-700 hover:bg-emerald-800 text-white transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>Send<span className="hidden min-[360px]:inline"> Parcel</span></span>
              <ArrowRight className="h-3 w-3 hidden sm:inline" />
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden cursor-pointer shrink-0"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Menu */}
        {menuOpen && (
          <div className="border-t border-slate-200/80 bg-white px-4 py-5 md:hidden animate-in slide-in-from-top-3 duration-200">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Main Services
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {primaryNavLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition"
                    >
                      {item.label}
                    </Link>
                  ))}
                  {currentUser && (
                    <Link
                      href="/activity"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                    >
                      My Deliveries
                    </Link>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Discover More
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {secondaryNavLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setTrackingOpen(true)
                  }}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 py-2.5 px-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition"
                >
                  <PackageSearch className="h-4 w-4 text-slate-500" />
                  <span>Track Parcel ID</span>
                </button>
                <Link
                  href="/create-trip"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 py-2.5 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                >
                  <Plane className="h-3.5 w-3.5 text-slate-500" />
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
