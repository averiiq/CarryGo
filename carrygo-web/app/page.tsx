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
  Star,
  Train,
  Wallet,
} from 'lucide-react'
import { Reveal } from '@/components/marketing/animated-reveal'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { SectionHeading } from '@/components/marketing/section-heading'
import { HeroRouteSearch } from '@/components/marketing/hero-route-search'
import { HeroRouteSimulator } from '@/components/marketing/hero-route-simulator'
import { HeroSplitExperience } from '@/components/marketing/hero-split-experience'
import { PromotionalBannerCarousel } from '@/components/marketing/promotional-banner-carousel'
import { AppQuickActions } from '@/components/marketing/app-quick-actions'
import { AppMarketplaceFeed, FeedTrip, FeedParcel } from '@/components/marketing/app-marketplace-feed'
import { CorridorsMarketplace } from '@/components/marketing/corridors-marketplace'
import { CourierComparison } from '@/components/marketing/courier-comparison'
import { RateCalculator } from '@/components/marketing/rate-calculator'
import { MobileAppShowcase } from '@/components/marketing/mobile-app-showcase'
import { testimonials } from '@/components/marketing/site-data'
import { createMarketingMetadata } from '@/lib/marketing-metadata'
import { createAdminClient } from '@/utils/supabase/admin'

export const metadata = createMarketingMetadata(
  'Peer-to-Peer Intercity Parcel Delivery in Haryana',
  'Connect with verified travelers across Haryana for same-day, secure, and 60% cheaper parcel delivery between Gurugram, Faridabad, Panipat, Ambala, and Rohtak.',
  '/'
)

const TRUST_PILLARS = [
  {
    title: 'Verified travel companions',
    description: 'Every carrier completes government ID (Aadhaar or Driving License) verification and facial verification before accepting parcels.',
    icon: ShieldCheck,
    tag: 'Govt. KYC verified',
  },
  {
    title: 'Two-step passkey verification',
    description: 'Private 4-digit verification passkeys required at pickup and dropoff ensure zero parcel mix-up and personal handover.',
    icon: KeyRound,
    tag: 'Passkey handshake',
  },
  {
    title: 'Safe Pay booking protection',
    description: 'Delivery rewards remain held in protected reserve and are automatically settled to the traveler UPI immediately after recipient signoff.',
    icon: Lock,
    tag: 'Protected reserve',
  },
  {
    title: 'Resolution support on every trip',
    description: 'Comprehensive transit safety pledge backed by dedicated support and tamper-proof digital travel records.',
    icon: BadgeCheck,
    tag: 'Transit assurance',
  },
]

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LandingPage() {
  let liveTrips: FeedTrip[] = []
  let liveParcels: FeedParcel[] = []

  try {
    const today = new Date().toISOString().split('T')[0]
    const supabase = createAdminClient()
    const [tripsRes, parcelsRes] = await Promise.all([
      supabase
        .from('trips')
        .select('id, from_city, to_city, date, time, vehicle_type, available_capacity, price_per_kg, user_name')
        .eq('status', 'active')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(12),
      supabase
        .from('parcels')
        .select('id, from_city, to_city, delivery_date, weight, category, description, price_offer, user_name, status')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(12),
    ])

    if (tripsRes.data && tripsRes.data.length > 0) {
      liveTrips = tripsRes.data as FeedTrip[]
    }
    if (parcelsRes.data && parcelsRes.data.length > 0) {
      liveParcels = parcelsRes.data as FeedParcel[]
    }
  } catch {
    liveTrips = []
    liveParcels = []
  }

  return (
    <MarketingShell>
      {/* 1. HERO SECTION: Clean Asymmetric Split with Live Route Simulator */}
      <section className="px-4 pt-10 pb-16 sm:px-6 md:pt-16 md:pb-20 relative z-10 bg-slate-50/70 border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl">
          {/* Headline & Subtitle */}
          <div className="max-w-3xl space-y-3 mb-8">
            <Reveal delay={0.05}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>Intercity commuter network across Haryana</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-heading font-bold tracking-tight text-slate-900 leading-[1.12]">
                Intercity parcel delivery at the speed of real travel
              </h1>

              <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl">
                Send packages between Gurugram, Faridabad, Panipat, Ambala, and Rohtak with daily travelers. Same-day delivery, 60% lower rates, and private two-step passkey verification.
              </p>
            </Reveal>
          </div>

          <PromotionalBannerCarousel />

          {/* Quick Actions Row */}
          <Reveal delay={0.08}>
            <div className="my-6 max-w-2xl">
              <AppQuickActions />
            </div>
          </Reveal>

          {/* Responsive Split Experience */}
          <Reveal delay={0.12}>
            <HeroSplitExperience />
          </Reveal>

          {/* Grounded Trust Pillars Strip */}
          <Reveal delay={0.16}>
            <div className="mt-12 pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-5xl mx-auto border-t border-slate-200/80 text-left">
              <div className="p-4 rounded-xl bg-white border border-slate-200/80">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Coverage</p>
                <p className="text-xl sm:text-2xl font-heading font-semibold text-slate-900 mt-1 tabular-nums">22 Districts</p>
                <p className="text-xs text-slate-500 mt-0.5">Across Haryana corridors</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200/80">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Verification</p>
                <p className="text-xl sm:text-2xl font-heading font-semibold text-emerald-700 mt-1">100% ID Checked</p>
                <p className="text-xs text-slate-500 mt-0.5">Govt. Aadhaar &amp; driving license</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200/80">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Security</p>
                <p className="text-xl sm:text-2xl font-heading font-semibold text-slate-900 mt-1">Safe Pay Reserve</p>
                <p className="text-xs text-slate-500 mt-0.5">Settled after delivery OTP</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200/80">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Handover</p>
                <p className="text-xl sm:text-2xl font-heading font-semibold text-slate-900 mt-1">Two-Step PIN</p>
                <p className="text-xs text-slate-500 mt-0.5">Pickup &amp; dropoff passkeys</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2. LIVE APP MARKETPLACE FEED */}
      <section className="px-4 py-14 sm:px-6 md:py-20 border-b border-slate-200/80 bg-white relative z-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 mb-2">
              <Navigation className="w-3.5 h-3.5 text-slate-600" />
              <span>Live community feed</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-slate-900 tracking-tight">
              Community travel and parcel requests
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Connect with commuters departing with empty luggage space, or view active parcel requests awaiting delivery.
            </p>
          </div>
          <AppMarketplaceFeed initialTrips={liveTrips} initialParcels={liveParcels} />
        </div>
      </section>

      {/* 3. INTERACTIVE RATE CALCULATOR */}
      <section className="px-4 py-16 sm:px-6 md:py-20 bg-slate-50/50 border-b border-slate-200/80 relative z-10">
        <div className="mx-auto max-w-5xl">
          <RateCalculator />
        </div>
      </section>

      {/* 4. COURIER COMPARISON MATRIX */}
      <section className="px-4 py-16 sm:px-6 md:py-20 bg-white border-b border-slate-200/80 relative z-10">
        <div className="mx-auto max-w-5xl">
          <CourierComparison />
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section className="px-4 py-16 sm:px-6 md:py-20 bg-slate-50/50 border-b border-slate-200/80 relative z-10">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            label="How it works"
            title="Designed for senders and daily commuters"
            description="Clear checkpoints, private passkeys, and instant UPI payouts at every stage."
          />

          <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-500">01</span>
                <h3 className="text-sm font-semibold text-slate-900 mt-2">Post parcel details</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Enter pickup and dropoff cities, parcel weight, and preferred delivery time.
                </p>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 mt-4 block">Takes 1 minute</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-500">02</span>
                <h3 className="text-sm font-semibold text-slate-900 mt-2">Match with traveler</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Pick an ID-verified traveler already driving or taking the train on your exact route.
                </p>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 mt-4 block">Govt. ID verified</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-500">03</span>
                <h3 className="text-sm font-semibold text-slate-900 mt-2">Pickup with passkey</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Hand over parcel in person and share the 4-digit pickup code inside the app.
                </p>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 mt-4 block">Zero mix-up</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-500">04</span>
                <h3 className="text-sm font-semibold text-slate-900 mt-2">Delivery &amp; release</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Recipient inspects package and shares delivery OTP. Held funds are paid out to the traveler.
                </p>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 mt-4 block">Instant settlement</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. VERIFIED TRAVEL NETWORK (TRUST PILLARS) */}
      <section className="px-4 py-16 sm:px-6 md:py-20 bg-white border-b border-slate-200/80 relative z-10">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            label="Trust and safety"
            title="Standards for peace of mind"
            description="Strict identity verification, private passkeys, and held payment custody ensure reliable handovers."
          />

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TRUST_PILLARS.map((pillar) => {
              const Icon = pillar.icon
              return (
                <div key={pillar.title} className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                        <Icon className="w-5 h-5 text-emerald-700" />
                      </div>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                        {pillar.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 7. MOBILE APP SHOWCASE */}
      <section className="px-4 py-16 sm:px-6 md:py-20 bg-slate-50/50 border-b border-slate-200/80 relative z-10">
        <div className="mx-auto max-w-5xl">
          <MobileAppShowcase />
        </div>
      </section>

      {/* 8. RECENT REVIEWS */}
      <section className="px-4 py-16 sm:px-6 md:py-20 bg-white border-b border-slate-200/80 relative z-10">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            label="Reviews"
            title="Feedback from regular senders and commuters"
            description="Real stories from users moving packages on Haryana highway corridors."
          />

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {testimonials.map((review) => (
              <div key={review.name} className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between space-y-4">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  &ldquo;{review.quote}&rdquo;
                </p>

                <div className="pt-3 border-t border-slate-200/60 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-semibold text-xs">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                      <span>{review.name}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-[11px] text-slate-500">{review.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FINAL CALL TO ACTION */}
      <section className="px-4 py-16 sm:px-6 md:py-20 bg-slate-50/70 relative z-10">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white border border-slate-200/90 p-8 sm:p-12 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Ready to send a parcel or earn along your commute?
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
            Connect with verified travelers on your corridor. Same-day delivery with private passkey verification and protected booking settlement.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/create-parcel"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors"
            >
              <span>Send a parcel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/create-trip"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Plane className="w-4 h-4 text-emerald-600" />
              <span>Post a trip</span>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}