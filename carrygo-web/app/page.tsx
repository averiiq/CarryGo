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
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { HeroRouteSearch } from '@/components/marketing/hero-route-search'
import { HeroRouteSimulator } from '@/components/marketing/hero-route-simulator'
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

export default async function LandingPage() {
  let liveTrips: TripPreview[] = []

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('trips')
      .select('id, from_city, to_city, date, vehicle_type, available_capacity, price_per_kg, user_name')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
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
      <ScrollLinkedSection className="px-4 pt-8 pb-16 sm:px-6 md:pt-14 md:pb-24 relative z-10">
        <div className="mx-auto max-w-7xl">
          {/* Top Live Network Pulse Badge */}
          <div className="flex justify-center mb-6">
            <Reveal>
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
                <span className="status-beacon" />
                <span className="font-mono tracking-wide">
                  Live Across All 22 Districts of Haryana • Active Travelers En Route
                </span>
              </div>
            </Reveal>
          </div>

          {/* Hero Headline & Subhead */}
          <div className="text-center max-w-4xl mx-auto space-y-4 mb-10 sm:mb-12">
            <Reveal delay={0.05}>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Intercity Parcel Delivery at the{' '}
                <span className="text-emerald-700">Speed of Real Travel</span>
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mx-auto max-w-2xl text-sm sm:text-lg text-slate-600 leading-relaxed">
                Connect directly with verified travelers commuting across Haryana. Send urgent documents, gifts, and packages same-day between Gurugram, Faridabad, Panipat, Ambala, Rohtak, and all 22 districts.
              </p>
            </Reveal>
          </div>

          {/* Split Screen Hero: Left Route Search | Right Live Route Simulator */}
          <Reveal delay={0.15}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center max-w-6xl mx-auto">
              {/* Left Column: Interactive Route Search */}
              <div className="lg:col-span-6 w-full">
                <HeroRouteSearch />
              </div>

              {/* Right Column: Live Corridor Simulator HUD */}
              <div className="lg:col-span-6 w-full">
                <HeroRouteSimulator />
              </div>
            </div>
          </Reveal>

          {/* Trust Highlights Strip */}
          <Reveal delay={0.2}>
            <div className="mt-14 sm:mt-16 pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto border-t border-slate-200 text-center">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">10,000+</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Parcels Safely Moved</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-emerald-700">100%</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Aadhaar Verified</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-sky-700">₹0 Risk</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Smart Escrow Vault</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-amber-600">4.9 ★</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">App Store Rating</p>
              </div>
            </div>
          </Reveal>
        </div>
      </ScrollLinkedSection>

      {/* 2. LIVE AVAILABLE CORRIDORS MARKETPLACE */}
      <ScrollLinkedSection className="px-4 py-14 sm:px-6 md:py-20 border-y border-slate-200/80 bg-white relative z-10">
        <div className="mx-auto max-w-6xl">
          <CorridorsMarketplace trips={displayTrips} />
        </div>
      </ScrollLinkedSection>

      {/* 3. INTERACTIVE RATE & SPEED CALCULATOR */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 relative z-10">
        <Reveal>
          <RateCalculator />
        </Reveal>
      </ScrollLinkedSection>

      {/* 4. COURIER COMPARISON MATRIX */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 border-y border-slate-200/80 bg-slate-50/50 relative z-10">
        <Reveal>
          <CourierComparison />
        </Reveal>
      </ScrollLinkedSection>

      {/* 5. DUAL PERSONA JOURNEY: SENDERS VS TRAVELERS */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 border-y border-slate-200/80 bg-white relative z-10">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="How It Works"
            title="Engineered for Senders &amp; Daily Travelers"
            description="Clear checkpoints, encrypted dual-OTPs, and instant UPI payouts at every stage."
          />

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sender Journey */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-slate-900">For Senders</h3>
                  <p className="text-xs text-slate-500">Ship packages same-day in 4 simple steps</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: 'Post Parcel Details',
                    desc: 'Input pickup/dropoff cities, package weight, and delivery timeline in under 2 minutes.',
                  },
                  {
                    step: 2,
                    title: 'Choose Verified Traveler',
                    desc: 'Browse Aadhaar-verified travelers heading your way. Review ratings, vehicle type, and baggage capacity.',
                  },
                  {
                    step: 3,
                    title: 'Doorstep Pickup with OTP',
                    desc: 'Meet traveler in-person. Verify their ID badge and authenticate handover with your 4-digit pickup code.',
                  },
                  {
                    step: 4,
                    title: 'Handshake Confirmed & Reward Released',
                    desc: 'Recipient inspects package and shares dropoff passkey. Rewards safely held in SafeVault™ are instantly released.',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mt-0.5 border border-emerald-200">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  href="/create-parcel"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition cursor-pointer"
                >
                  <span>Dispatch a Package</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Traveler Journey */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 border border-sky-200">
                  <Plane className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-slate-900">For Travelers</h3>
                  <p className="text-xs text-slate-500">Offset travel expenses on trips you already make</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: 'Share Your Travel Itinerary',
                    desc: 'Enter departure city, destination, travel time, and available kilograms of luggage or car trunk space.',
                  },
                  {
                    step: 2,
                    title: 'Review & Accept Parcel Requests',
                    desc: 'Browse senders along your route. Accept only sealed packages and items you feel 100% comfortable carrying.',
                  },
                  {
                    step: 3,
                    title: 'Handover & Travel Regularly',
                    desc: 'Inspect parcel exterior, enter sender pickup OTP, and carry item during your regular train, flight, or drive.',
                  },
                  {
                    step: 4,
                    title: 'Instant Payout to UPI / Bank',
                    desc: 'Hand parcel to recipient, input delivery OTP, and receive instant funds deposited directly to your bank account.',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-800 text-xs font-bold mt-0.5 border border-sky-200">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  href="/create-trip"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer"
                >
                  <span>Host a Travel Journey</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ScrollLinkedSection>

      {/* 6. BENTO TRUST & SECURITY FORTRESS */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 relative z-10 overflow-hidden">
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

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRUST_PILLARS.map((pillar, index) => {
              return (
                <Reveal key={pillar.title} delay={index * 0.05}>
                  <div className="rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-xs p-6 space-y-4 h-full shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between group">
                    <div className="space-y-3.5">
                      <InteractiveIconBadge tone={pillar.tone} className="w-14 h-14">
                        {pillar.component === 'shield' && <AnimatedShieldBeacon size={36} color="#059669" />}
                        {pillar.component === 'route' && <AnimatedRouteNode size={36} color="#0284C7" />}
                        {pillar.component === 'vault' && <AnimatedWalletVault size={36} color="#D97706" />}
                        {pillar.component === 'package' && <AnimatedPackageDelivery size={36} color="#6366F1" />}
                      </InteractiveIconBadge>

                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        {pillar.tag}
                      </span>
                      <h3 className="text-base font-heading font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {pillar.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-slate-600">{pillar.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Signature Assurance</span>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </ScrollLinkedSection>

      {/* 7. INTERACTIVE MOBILE APP SHOWCASE */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 border-y border-slate-200/80 bg-white relative z-10">
        <Reveal>
          <MobileAppShowcase />
        </Reveal>
      </ScrollLinkedSection>

      {/* 8. REAL VERIFIED REVIEWS WITH ROUTE STAMPS */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 relative z-10">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="Verified Reviews"
            title="Trusted by Frequent Senders &amp; Commuters"
            description="Real stories from users moving packages across India's busiest transit corridors."
          />

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((review, index) => (
              <Reveal key={review.name} delay={index * 0.05}>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm flex flex-col justify-between h-full">
                  <div className="space-y-3">
                    <div className="flex items-center text-amber-500 gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                      &ldquo;{review.quote}&rdquo;
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
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
          <div className="mx-auto max-w-5xl rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl p-8 sm:p-14 text-center relative overflow-hidden">
            <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-800 text-emerald-400 border border-slate-700">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Join India&apos;s Fastest Delivery Network</span>
              </span>

              <h2 className="text-2xl sm:text-4xl md:text-5xl font-heading font-extrabold text-white tracking-tight leading-tight">
                Ready to Send a Parcel or Monetize Your Next Journey?
              </h2>

              <p className="text-xs sm:text-base text-slate-300 leading-relaxed">
                Connect with verified travelers on your corridor. Same-day handovers, zero transit delays, and complete escrow protection.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5">
                <Link
                  href="/create-parcel"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  <span>Send a Parcel Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/create-trip"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-sm font-semibold border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
                >
                  <Plane className="w-4 h-4 text-slate-300" />
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
