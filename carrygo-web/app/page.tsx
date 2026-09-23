import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  Navigation,
  Package,
  Plane,
  ShieldCheck,
  Sparkles,
  Star,
  Train,
  Wallet,
  Zap,
} from 'lucide-react'
import { Reveal } from '@/components/marketing/animated-reveal'
import { ParallaxLayer, ScrollExpandContainer } from '@/components/marketing/parallax-wrapper'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { HeroRouteSearch } from '@/components/marketing/hero-route-search'
import { HeroRouteSimulator } from '@/components/marketing/hero-route-simulator'
import { HeroTransitVectors } from '@/components/marketing/hero-transit-vectors'
import { HeroSplitExperience } from '@/components/marketing/hero-split-experience'
import { CorridorsMarketplace } from '@/components/marketing/corridors-marketplace'
import { CourierComparison } from '@/components/marketing/courier-comparison'
import { RateCalculator } from '@/components/marketing/rate-calculator'
import { MobileAppShowcase } from '@/components/marketing/mobile-app-showcase'
import { testimonials } from '@/components/marketing/site-data'
import { createMarketingMetadata } from '@/lib/marketing-metadata'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  AnimatedShieldBeacon,
  AnimatedRouteNode,
  AnimatedWalletVault,
  AnimatedPackageDelivery,
  InteractiveIconBadge,
} from '@/components/ui/animated-icons'
import { NumberTicker } from '@/components/ui/number-ticker'
import { GsapScrollExpand, GsapParallaxItem } from '@/components/marketing/gsap-scroll-suite'
import { ScrollTrackJourney } from '@/components/marketing/scroll-track-journey'

export const metadata = createMarketingMetadata(
  'Peer-to-Peer Intercity Parcel Delivery in Haryana',
  'Connect with verified travelers across Haryana for same-day, secure, and 60% cheaper parcel delivery between Gurugram, Faridabad, Panipat, Ambala, and Rohtak.',
  '/'
)

type TripPreview = {
  id: string
  from_city: string
  to_city: string
  date: string
  vehicle_type: string
  available_capacity: number
  price_per_kg: number
  user_name: string | null
}

const TRUST_PILLARS = [
  {
    title: '100% Verified Travel Companions',
    description: 'Every carrier undergoes automated government ID (Aadhaar/Driving License) and real-time facial verification before accepting parcels.',
    icon: ShieldCheck,
    tag: 'Govt. KYC Verified',
    tone: 'emerald' as const,
    component: 'shield' as const,
  },
  {
    title: 'Dual Golden Handshake PIN',
    description: 'Private 4-digit verification passkeys required at pickup and dropoff ensure zero parcel mix-up and guaranteed personal handover.',
    icon: KeyRound,
    tag: 'Golden Passkey',
    tone: 'sky' as const,
    component: 'route' as const,
  },
  {
    title: 'SafeVault™ Payout Protection',
    description: 'Delivery rewards remain held in protected custody and are automatically released to the traveler\'s UPI immediately after recipient signoff.',
    icon: Lock,
    tag: 'Protected Reserve',
    tone: 'amber' as const,
    component: 'vault' as const,
  },
  {
    title: '₹10,000 Signature Peace of Mind',
    description: 'Comprehensive transit safety pledge backed by our dedicated Resolution Concierge and tamper-proof digital travel records.',
    icon: BadgeCheck,
    tag: 'Signature Assurance',
    tone: 'indigo' as const,
    component: 'package' as const,
  },
]

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LandingPage() {
  let liveTrips: TripPreview[] = []

  try {
    const today = new Date().toISOString().split('T')[0]
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('trips')
      .select('id, from_city, to_city, date, vehicle_type, available_capacity, price_per_kg, user_name')
      .eq('status', 'active')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(8)

    if (data && data.length > 0) {
      liveTrips = data as TripPreview[]
    }
  } catch {
    liveTrips = []
  }

  const displayTrips = liveTrips

  return (
    <MarketingShell>
      {/* 1. HERO SECTION: Split Layout with Interactive Route Simulator */}
      <ScrollLinkedSection className="px-4 pt-10 pb-16 sm:px-6 md:pt-16 md:pb-24 relative z-10 ambient-mesh-subtle overflow-hidden">
        {/* Ambient Subtle Multi-stop Mesh Aurora */}
        <div className="absolute inset-0 -z-10 gradient-mesh-aurora pointer-events-none" />
        {/* Subtle Micro-dot Geometric Pattern with Radial Vignette */}
        <div className="absolute inset-0 -z-10 pattern-dots mask-radial-vignette opacity-50 pointer-events-none" />
        {/* Minimal Engineering Grid Background */}
        <div className="absolute inset-0 -z-10 bg-grid-minimal mask-radial-vignette opacity-50 pointer-events-none" />
        {/* Animated Transit Vector SVG Shapes */}
        <HeroTransitVectors />

        {/* Subtle decorative background blur layer with gentle parallax */}
        <ParallaxLayer speed={-0.12} className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-emerald-500/8 via-teal-500/5 to-sky-500/8 blur-3xl rounded-full" />
        </ParallaxLayer>

        <div className="mx-auto max-w-7xl">
          {/* Left-Aligned Editorial Header: Headline + Subheading */}
          <div className="max-w-3xl space-y-4 mb-8">
            <Reveal delay={0.05}>
              {/* Eyebrow Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/90 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Haryana&apos;s Dedicated P2P Commuter Transit • All 22 Districts</span>
              </div>

              {/* Left-Aligned High-Impact Typography */}
              <h1 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-heading font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Intercity Parcel Delivery at the{' '}
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                  Speed of Real Travel
                </span>
              </h1>

              {/* Left-Aligned High-Clarity Subheading */}
              <p className="mt-4 text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl">
                Connect directly with verified commuters traveling across Haryana. Send urgent documents, gifts, and packages same-day between Gurugram, Faridabad, Panipat, Ambala, and Rohtak — 60% cheaper with guaranteed dual-OTP handovers.
              </p>
            </Reveal>
          </div>

          {/* Responsive Split Experience: Desktop side-by-side | Mobile segmented toggle */}
          <Reveal delay={0.12}>
            <HeroSplitExperience />
          </Reveal>

          {/* Trust Highlights Strip with Animated Number Tickers */}
          <Reveal delay={0.2}>
            <div className="mt-14 sm:mt-16 pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto border-t border-slate-200/80 text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-b from-white via-slate-50/40 to-white border border-slate-200/90 relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-slate-400/50 to-transparent" />
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">
                  <NumberTicker value={10480} suffix="+" />
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Parcels Safely Moved</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-b from-white via-emerald-50/30 to-white border border-slate-200/90 relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-emerald-700">
                  <NumberTicker value={100} suffix="%" />
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Aadhaar &amp; Face Verified</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-b from-white via-sky-50/30 to-white border border-slate-200/90 relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-sky-700">₹0 Risk</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Smart Escrow Vault</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-b from-white via-amber-50/30 to-white border border-slate-200/90 relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-amber-600">
                  <NumberTicker value={4.9} decimalPlaces={1} suffix=" ★" />
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">App Store Rating</p>
              </div>
            </div>
          </Reveal>
        </div>
      </ScrollLinkedSection>

      {/* 2. LIVE AVAILABLE CORRIDORS MARKETPLACE - Only shown when genuine active trips exist */}
      {displayTrips.length > 0 && (
        <ScrollLinkedSection className="px-4 py-14 sm:px-6 md:py-20 border-y border-slate-200/80 bg-white relative z-10">
          <div className="mx-auto max-w-6xl">
            <CorridorsMarketplace trips={displayTrips} />
          </div>
        </ScrollLinkedSection>
      )}

      {/* 3. INTERACTIVE RATE & SPEED CALCULATOR */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 relative z-10">
        {/* Subtle Minimal Grid Background */}
        <div className="absolute inset-0 -z-10 bg-grid-minimal mask-radial-vignette opacity-30 pointer-events-none" />
        <GsapScrollExpand startScale={0.94} endScale={1.0}>
          <RateCalculator />
        </GsapScrollExpand>
      </ScrollLinkedSection>

      {/* 4. COURIER COMPARISON MATRIX */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 border-y border-slate-200/80 bg-slate-50/50 relative z-10">
        <GsapScrollExpand startScale={0.94} endScale={1.0}>
          <CourierComparison />
        </GsapScrollExpand>
      </ScrollLinkedSection>

      {/* 5. DUAL PERSONA JOURNEY: SCROLL-TO-TRACK PROGRESSION */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 border-y border-slate-200/80 bg-white relative z-10">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="How It Works"
            title="Engineered for Senders &amp; Daily Travelers"
            description="Clear checkpoints, encrypted dual-OTPs, and instant UPI payouts at every stage."
          />

          <div className="mt-12">
            <ScrollTrackJourney />
          </div>
        </div>
      </ScrollLinkedSection>

      {/* 6. BENTO TRUST & SECURITY FORTRESS */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 relative z-10 overflow-hidden bg-slate-50/30">
        {/* Subtle Geometric Dot Pattern with Radial Vignette */}
        <div className="absolute inset-0 -z-10 pattern-dots mask-radial-vignette opacity-40 pointer-events-none" />
        {/* Subtle Minimal Grid Background */}
        <div className="absolute inset-0 -z-10 bg-grid-minimal mask-radial-vignette opacity-25 pointer-events-none" />

        {/* Ambient Mesh Aurora Wallpaper Backdrop */}
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.05] dark:opacity-[0.12] overflow-hidden">
          <Image
            src="/images/abstract/mesh-aurora-bg.jpg"
            alt="Mesh Aurora Background"
            fill
            className="object-cover scale-105"
            priority={false}
          />
        </div>

        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="Signature Assurance"
            title="Engineered for Absolute Trust &amp; Peace of Mind"
            description="Strict verification, private dual passkeys, and SafeVault™ protection ensure flawless delivery."
          />

          {/* Asymmetric Bento Architecture (Linear / Apple Editorial Language) */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Bento Cell 1: 100% Verified Travel Companions (Spans 7 Cols) */}
            <div className="md:col-span-7">
              <Reveal delay={0.05}>
                <div className="sturdy-card p-6 sm:p-8 h-full flex flex-col justify-between group relative overflow-hidden bg-gradient-to-br from-white via-white to-emerald-50/40 border border-slate-200/90">
                  {/* Top Hairline Gradient Accent */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />
                  <div className="absolute inset-0 pattern-dots opacity-20 mask-radial-vignette pointer-events-none" />

                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <InteractiveIconBadge tone="emerald" className="w-14 h-14">
                        <AnimatedShieldBeacon size={36} color="#059669" />
                      </InteractiveIconBadge>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Govt. KYC Verified
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-heading font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        100% Verified Travel Companions
                      </h3>
                      <p className="text-xs sm:text-sm leading-relaxed text-slate-600 mt-1.5 max-w-xl">
                        Every carrier undergoes automated government ID (Aadhaar or Driving License) verification paired with real-time biometric facial liveness match before receiving parcel assignments.
                      </p>
                    </div>

                    {/* Interactive Telemetry Chip */}
                    <div className="p-3.5 rounded-2xl bg-white border border-emerald-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-slate-800">Aadhaar OCR Validated</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-600" />
                        <span className="font-semibold text-slate-800">Biometric Liveness Matched</span>
                      </div>
                      <div className="text-[11px] font-bold text-emerald-700 font-mono">
                        Active in 22 Districts
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs relative z-10">
                    <span className="text-slate-500 font-medium">Haryana Commuter Network Standard</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Strict Zero-Tolerance Policy
                    </span>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Bento Cell 2: Dual Golden Handshake PIN (Spans 5 Cols) */}
            <div className="md:col-span-5">
              <Reveal delay={0.1}>
                <div className="sturdy-card p-6 sm:p-8 h-full flex flex-col justify-between group relative overflow-hidden bg-gradient-to-br from-white via-white to-sky-50/40 border border-slate-200/90">
                  {/* Top Hairline Gradient Accent */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-500 via-teal-400 to-indigo-500" />
                  <div className="absolute inset-0 pattern-dots opacity-20 mask-radial-vignette pointer-events-none" />

                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <InteractiveIconBadge tone="sky" className="w-14 h-14">
                        <AnimatedRouteNode size={36} color="#0284C7" />
                      </InteractiveIconBadge>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                        Dual Passkey
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-heading font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                        Dual Golden Handshake PIN
                      </h3>
                      <p className="text-xs sm:text-sm leading-relaxed text-slate-600 mt-1.5">
                        Private 4-digit verification passkeys required at pickup and dropoff ensure zero parcel mix-up and guaranteed personal handover.
                      </p>
                    </div>

                    {/* Visual PIN Preview Blocks */}
                    <div className="p-3 rounded-2xl bg-white border border-sky-200/80 flex items-center justify-center gap-2">
                      {['4', '9', '2', '0'].map((digit, i) => (
                        <div
                          key={i}
                          className="w-9 h-11 rounded-xl bg-sky-50 text-sky-950 border border-sky-300 font-mono font-extrabold text-base flex items-center justify-center"
                        >
                          {digit}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs relative z-10">
                    <span className="text-slate-500 font-medium">Pickup &amp; Dropoff Protected</span>
                    <span className="font-bold text-sky-700">Encrypted In Transit</span>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Bento Cell 3: SafeVault™ Payout Protection (Spans 5 Cols) */}
            <div className="md:col-span-5">
              <Reveal delay={0.15}>
                <div className="sturdy-card p-6 sm:p-8 h-full flex flex-col justify-between group relative overflow-hidden bg-gradient-to-br from-white via-white to-amber-50/40 border border-slate-200/90">
                  {/* Top Hairline Gradient Accent */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-orange-400 to-emerald-500" />
                  <div className="absolute inset-0 pattern-dots opacity-20 mask-radial-vignette pointer-events-none" />

                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <InteractiveIconBadge tone="amber" className="w-14 h-14">
                        <AnimatedWalletVault size={36} color="#D97706" />
                      </InteractiveIconBadge>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        SafeVault™ Escrow
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-heading font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                        Protected UPI Escrow
                      </h3>
                      <p className="text-xs sm:text-sm leading-relaxed text-slate-600 mt-1.5">
                        Delivery rewards remain held in protected escrow and are automatically released to the traveler&apos;s UPI instantly upon recipient OTP entry.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-amber-200/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-slate-800">100% Upfront Reserve</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-700">Instant UPI Release</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs relative z-10">
                    <span className="text-slate-500 font-medium">Instant Bank Settlement</span>
                    <span className="font-bold text-amber-700">Zero Payment Disputes</span>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Bento Cell 4: ₹10,000 Signature Peace of Mind (Spans 7 Cols) */}
            <div className="md:col-span-7">
              <Reveal delay={0.2}>
                <div className="sturdy-card p-6 sm:p-8 h-full flex flex-col justify-between group relative overflow-hidden bg-gradient-to-br from-white via-white to-indigo-50/40 border border-slate-200/90">
                  {/* Top Hairline Gradient Accent */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-400 to-sky-500" />
                  <div className="absolute inset-0 pattern-dots opacity-20 mask-radial-vignette pointer-events-none" />

                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <InteractiveIconBadge tone="indigo" className="w-14 h-14">
                        <AnimatedPackageDelivery size={36} color="#6366F1" />
                      </InteractiveIconBadge>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                        ₹10,000 Pledge
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-heading font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                        ₹10,000 Signature Peace of Mind
                      </h3>
                      <p className="text-xs sm:text-sm leading-relaxed text-slate-600 mt-1.5 max-w-xl">
                        Comprehensive transit safety guarantee backed by our dedicated 24/7 Resolution Concierge and tamper-proof digital travel records across all 22 Haryana districts.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-indigo-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <span className="font-semibold text-slate-800">Direct Resolution Concierge</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <span className="font-semibold text-slate-800">&lt; 2 Hr Rapid Claim Response</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs relative z-10">
                    <span className="text-slate-500 font-medium">CarryGo Community Trust Covenant</span>
                    <span className="font-bold text-indigo-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Full Value Protection
                    </span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </ScrollLinkedSection>

      {/* 7. INTERACTIVE MOBILE APP SHOWCASE */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 border-y border-slate-200/80 bg-white relative z-10">
        <GsapScrollExpand startScale={0.93} endScale={1.0}>
          <MobileAppShowcase />
        </GsapScrollExpand>
      </ScrollLinkedSection>

      {/* 8. REAL VERIFIED REVIEWS WITH ROUTE STAMPS */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 relative z-10 bg-slate-50/40 overflow-hidden">
        {/* Subtle Grid Pattern with Radial Vignette */}
        <div className="absolute inset-0 -z-10 pattern-grid opacity-20 mask-radial-vignette pointer-events-none" />

        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="Verified Reviews"
            title="Trusted by Frequent Senders &amp; Commuters"
            description="Real stories from users moving packages across India's busiest transit corridors."
          />

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((review, index) => (
              <Reveal key={review.name} delay={index * 0.05}>
                <div className="p-6 space-y-4 flex flex-col justify-between h-full rounded-3xl bg-gradient-to-b from-white via-slate-50/30 to-white border border-slate-200/90 relative overflow-hidden">
                  {/* Subtle Top Accent */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
                  <div className="absolute inset-0 pattern-dots opacity-15 mask-radial-vignette pointer-events-none" />

                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center text-amber-500 gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                      &ldquo;{review.quote}&rdquo;
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center gap-3 relative z-10">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-xs">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <span>{review.name}</span>
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      </div>
                      <div className="text-[11px] text-slate-500">{review.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </ScrollLinkedSection>

      {/* 9. HIGH-IMPACT FINAL CTA BANNER */}
      <ScrollLinkedSection className="px-4 pt-8 pb-20 sm:px-6 md:pb-28 relative z-10">
        <Reveal>
          <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-100/50 border border-emerald-300/80 text-slate-900 p-8 sm:p-14 text-center relative overflow-hidden">
            {/* Top Hairline Gradient Accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />
            {/* Elegant Micro-dot Pattern with Radial Vignette */}
            <div className="absolute inset-0 pattern-dots-emerald opacity-25 mask-radial-vignette pointer-events-none" />
            {/* Soft Ambient Glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[550px] h-[250px] bg-gradient-to-b from-emerald-400/15 via-teal-300/10 to-transparent blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-100/90 text-emerald-800 border border-emerald-300/90">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Join India&apos;s Fastest Delivery Network</span>
              </span>

              <h2 className="text-2xl sm:text-4xl md:text-5xl font-heading font-extrabold text-slate-900 tracking-tight leading-tight">
                Ready to Send a Parcel or Monetize Your Next Journey?
              </h2>

              <p className="text-xs sm:text-base text-slate-600 leading-relaxed">
                Connect with verified travelers on your corridor. Same-day handovers, zero transit delays, and complete escrow protection.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5">
                <Link
                  href="/create-parcel"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all active:scale-95 cursor-pointer"
                >
                  <span>Send a Parcel Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/create-trip"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
                >
                  <Plane className="w-4 h-4 text-emerald-600" />
                  <span>Post Travel Route</span>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}
