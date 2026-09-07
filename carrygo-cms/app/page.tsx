import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Handshake,
  KeyRound,
  Lock,
  MapPin,
  Navigation,
  Package,
  Plane,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingDown,
  Truck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { Reveal } from '@/components/marketing/animated-reveal'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { HeroRouteSearch } from '@/components/marketing/hero-route-search'
import { RateCalculator } from '@/components/marketing/rate-calculator'
import { MobileAppShowcase } from '@/components/marketing/mobile-app-showcase'
import { testimonials } from '@/components/marketing/site-data'
import { createMarketingMetadata } from '@/lib/marketing-metadata'
import { createClient } from '@/utils/supabase/server'

export const metadata = createMarketingMetadata(
  'Peer-to-Peer Intercity Parcel Delivery',
  'Connect with verified travelers traveling on your route for same-day, secure, and affordable parcel delivery.',
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

const FALLBACK_CORRIDORS: TripPreview[] = [
  {
    id: 'corridor-1',
    from_city: 'Mumbai',
    to_city: 'Pune',
    date: 'Today / Regular',
    vehicle_type: 'car',
    available_capacity: 8,
    price_per_kg: 50,
    user_name: 'Aditya S.',
  },
  {
    id: 'corridor-2',
    from_city: 'Delhi',
    to_city: 'Jaipur',
    date: 'Tomorrow morning',
    vehicle_type: 'train',
    available_capacity: 10,
    price_per_kg: 60,
    user_name: 'Pooja M.',
  },
  {
    id: 'corridor-3',
    from_city: 'Bangalore',
    to_city: 'Hyderabad',
    date: 'Daily Flights',
    vehicle_type: 'flight',
    available_capacity: 5,
    price_per_kg: 120,
    user_name: 'Vikram R.',
  },
  {
    id: 'corridor-4',
    from_city: 'Chennai',
    to_city: 'Bangalore',
    date: 'This Weekend',
    vehicle_type: 'car',
    available_capacity: 12,
    price_per_kg: 55,
    user_name: 'Sneha N.',
  },
]

const TRUST_PILLARS = [
  {
    title: '100% ID Verified Travelers',
    description: 'Every traveler undergoes strict government ID (Aadhaar/Passport) and selfie verification before accepting parcels.',
    icon: ShieldCheck,
    tone: 'text-primary bg-primary-subtle border-primary/20',
  },
  {
    title: 'Dual-OTP In-Person Handover',
    description: 'Unique OTP codes required at pickup and dropoff ensure packages are only handed over to verified persons.',
    icon: KeyRound,
    tone: 'text-accent bg-accent-subtle border-accent/20',
  },
  {
    title: 'Escrow Payment Vault',
    description: 'Delivery fares remain locked in escrow and are only released to the traveler once the recipient signs off with OTP.',
    icon: Lock,
    tone: 'text-success bg-success-subtle border-success/20',
  },
  {
    title: '24/7 Resolution & Protection',
    description: 'Dedicated support team and recorded audit trails protect your shipment throughout the entire journey.',
    icon: BadgeCheck,
    tone: 'text-warning bg-warning-subtle border-warning/20',
  },
]

export default async function LandingPage() {
  let liveTrips: TripPreview[] = []

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('trips')
      .select('id, from_city, to_city, date, vehicle_type, available_capacity, price_per_kg, user_name')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(4)

    if (data && data.length > 0) {
      liveTrips = data as TripPreview[]
    }
  } catch {
    // Graceful fallback to default corridors if database is unreachable
    liveTrips = []
  }

  const displayTrips = liveTrips.length > 0 ? liveTrips : FALLBACK_CORRIDORS

  return (
    <MarketingShell>
      {/* Hero Section */}
      <ScrollLinkedSection className="px-4 pt-12 pb-16 sm:px-6 md:pt-20 md:pb-24 overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="mx-auto max-w-5xl text-center space-y-5">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/25 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Generation Peer-to-Peer Delivery Network</span>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-extrabold tracking-tight text-foreground leading-[1.12]">
              Same-Day Intercity Deliveries with{' '}
              <span className="premium-text-gradient">Travelers Heading Your Way</span>
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted leading-relaxed">
              Send urgent documents, gifts, and packages faster and at up to 60% lower rates. Or monetize your empty car trunk or luggage space while traveling.
            </p>
          </Reveal>

          {/* Interactive Hero Route Search Widget */}
          <Reveal delay={0.15}>
            <div className="mt-8">
              <HeroRouteSearch />
            </div>
          </Reveal>

          {/* Trust Highlights Strip */}
          <Reveal delay={0.2}>
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-border/80 text-center">
              <div>
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">10,000+</p>
                <p className="text-xs text-muted font-medium mt-0.5">Parcels Delivered</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-primary">100%</p>
                <p className="text-xs text-muted font-medium mt-0.5">Verified Travelers</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">₹0 Risk</p>
                <p className="text-xs text-muted font-medium mt-0.5">Escrow Protection</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-heading font-extrabold text-accent">4.9 ★</p>
                <p className="text-xs text-muted font-medium mt-0.5">App Store Rating</p>
              </div>
            </div>
          </Reveal>
        </div>
      </ScrollLinkedSection>

      {/* Live Available Corridors Feed */}
      <ScrollLinkedSection className="px-4 py-12 sm:px-6 md:py-16 bg-surface-elevated/40 border-y border-border/70">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20 mb-2">
                <Navigation className="w-3.5 h-3.5" />
                <span>Live Marketplace</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
                Active Traveler Corridors
              </h2>
              <p className="text-sm text-muted mt-1">
                Travelers currently open to carry parcels on these verified routes.
              </p>
            </div>

            <Link
              href="/search"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition"
            >
              <span>View All 150+ Routes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayTrips.map((trip) => (
              <div
                key={trip.id}
                className="rounded-2xl bg-surface border border-border p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-md font-semibold bg-primary-subtle text-primary capitalize flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      {trip.vehicle_type}
                    </span>
                    <span className="text-muted font-medium">{trip.available_capacity} kg open</span>
                  </div>

                  <div>
                    <div className="text-base font-heading font-bold text-foreground flex items-center gap-1.5">
                      <span>{trip.from_city}</span>
                      <span className="text-muted text-sm">→</span>
                      <span>{trip.to_city}</span>
                    </div>
                    <p className="text-xs text-muted mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{trip.date}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <span className="text-muted">Rate from:</span>
                    <span className="font-heading font-bold text-foreground text-sm">
                      ₹{trip.price_per_kg}/kg
                    </span>
                  </div>
                </div>

                <div className="pt-3">
                  <Link
                    href={`/search?from=${encodeURIComponent(trip.from_city)}&to=${encodeURIComponent(trip.to_city)}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-surface-elevated text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                  >
                    <span>Match Traveler</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollLinkedSection>

      {/* Interactive Rate & Speed Calculator */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24">
        <Reveal>
          <RateCalculator />
        </Reveal>
      </ScrollLinkedSection>

      {/* Dual Persona Journey: Senders vs Travelers */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 bg-surface-elevated/40 border-y border-border/70">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="How It Works"
            title="A Seamless Experience for Senders &amp; Travelers"
            description="Clear protocols, real-time coordination, and zero ambiguity at every step."
          />

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sender Journey */}
            <div className="rounded-3xl bg-surface border border-border p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-subtle text-primary border border-primary/20">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-foreground">For Senders</h3>
                  <p className="text-xs text-muted">Ship packages in 4 simple steps</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: 'Post Parcel Details',
                    desc: 'Enter pickup, dropoff cities, parcel weight, and delivery timeline in under 2 minutes.',
                  },
                  {
                    step: 2,
                    title: 'Choose Verified Traveler',
                    desc: 'Review verified travelers already traveling on your route and pick the best match.',
                  },
                  {
                    step: 3,
                    title: 'Pickup with OTP Handover',
                    desc: 'Meet the traveler and verify pickup using a secure, time-stamped 4-digit OTP code.',
                  },
                  {
                    step: 4,
                    title: 'Confirm Delivery Drop',
                    desc: 'Recipient confirms dropoff with delivery OTP. Escrow payment is automatically finalized.',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                      <p className="text-xs text-muted leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  href="/create-parcel"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition shadow-sm"
                >
                  <span>Post a Parcel Request</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Traveler Journey */}
            <div className="rounded-3xl bg-surface border border-border p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-subtle text-accent border border-accent/20">
                  <Plane className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-foreground">For Travelers</h3>
                  <p className="text-xs text-muted">Offset your travel costs safely</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: 'Share Your Travel Plan',
                    desc: 'Enter departure city, destination, travel date, and how many kilograms of space you have.',
                  },
                  {
                    step: 2,
                    title: 'Accept Delivery Requests',
                    desc: 'Browse matching parcel requests and accept only packages you feel comfortable carrying.',
                  },
                  {
                    step: 3,
                    title: 'Pick Up & Carry on Journey',
                    desc: 'Inspect parcel, enter pickup OTP, and carry the item during your regular trip.',
                  },
                  {
                    step: 4,
                    title: 'Instant Payout to UPI / Bank',
                    desc: 'Drop the parcel, enter recipient OTP, and receive instant funds to your wallet.',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                      <p className="text-xs text-muted leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  href="/create-trip"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent-hover transition shadow-sm"
                >
                  <span>Post Your Travel Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ScrollLinkedSection>

      {/* 4-Point Trust & Security Protocol */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="Security & Trust"
            title="Built on Strict Verification &amp; Protected Escrow"
            description="Every precaution engineered into the protocol to ensure peace of mind for both senders and travelers."
          />

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRUST_PILLARS.map((pillar, index) => {
              const Icon = pillar.icon
              return (
                <Reveal key={pillar.title} delay={index * 0.05}>
                  <div className="rounded-3xl bg-surface border border-border p-6 space-y-3.5 h-full shadow-xs hover:shadow-md transition">
                    <div className={`inline-flex p-3 rounded-2xl border ${pillar.tone}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-heading font-bold text-foreground">
                      {pillar.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-muted">{pillar.description}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </ScrollLinkedSection>

      {/* Interactive Mobile App Showcase Section */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24 bg-surface-elevated/40 border-y border-border/70">
        <Reveal>
          <MobileAppShowcase />
        </Reveal>
      </ScrollLinkedSection>

      {/* Real Customer Stories & Social Proof */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="Verified Reviews"
            title="Trusted by Thousands of Senders &amp; Frequent Travelers"
            description="Real stories from people who move parcels and travel smarter every day."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((review, index) => (
              <Reveal key={review.name} delay={index * 0.05}>
                <div className="rounded-3xl bg-surface border border-border p-6 sm:p-7 space-y-4 shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center text-amber-500 gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed italic">
                      &ldquo;{review.quote}&rdquo;
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold text-xs">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">{review.name}</div>
                      <div className="text-[11px] text-muted">{review.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </ScrollLinkedSection>

      {/* High-Impact Final Call-to-Action Banner */}
      <ScrollLinkedSection className="px-4 pt-8 pb-20 sm:px-6 md:pb-28">
        <Reveal>
          <div className="mx-auto max-w-5xl rounded-3xl bg-surface border border-border shadow-2xl p-8 sm:p-12 text-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[90px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 blur-[90px] rounded-full pointer-events-none" />

            <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start Moving Smarter Today</span>
              </span>

              <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground tracking-tight">
                Ready to Send a Parcel or Earn on Your Next Trip?
              </h2>

              <p className="text-sm sm:text-base text-muted leading-relaxed">
                Join verified travelers and senders connecting daily across India&apos;s most active travel routes.
              </p>

              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/create-parcel"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  <span>Send a Parcel Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/create-trip"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold border border-border bg-surface-elevated text-foreground hover:bg-surface hover:border-primary/40 transition-all active:scale-95"
                >
                  <Plane className="w-4 h-4 text-accent" />
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
