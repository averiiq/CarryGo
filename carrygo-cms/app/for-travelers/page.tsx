import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Coins,
  Compass,
  CreditCard,
  Eye,
  IndianRupee,
  KeyRound,
  Lock,
  Plane,
  ShieldCheck,
  Sparkles,
  Train,
  Truck,
  UserCheck,
  Wallet,
  Zap,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata(
  'For Travelers — Monetize Your Luggage Space While Traveling',
  'Turn your regular commutes, road trips, train journeys, and flights into earnings. Offset your travel costs by carrying verified parcels safely.',
  '/for-travelers'
)

const travelerBenefits = [
  {
    title: 'Offset Your Travel Expenses',
    description: 'Earn ₹400 to ₹2,500+ per trip simply by carrying verified envelopes, electronics, or small packages on journeys you are already taking.',
    icon: Coins,
    tone: 'text-primary bg-primary-subtle border-primary/20',
  },
  {
    title: 'Full Inspection Rights',
    description: 'You always inspect package contents before accepting and sharing the pickup OTP. Never carry anything you have not visually verified.',
    icon: Eye,
    tone: 'text-accent bg-accent-subtle border-accent/20',
  },
  {
    title: 'Guaranteed Escrow Payouts',
    description: 'Sender funds are pre-locked in CarryGo escrow. Once the recipient shares their delivery OTP, funds hit your wallet immediately.',
    icon: Wallet,
    tone: 'text-success bg-success-subtle border-success/20',
  },
  {
    title: 'Total Schedule Flexibility',
    description: 'You set your route, travel date, vehicle type, and available luggage capacity. Only accept delivery requests that match your comfort.',
    icon: Compass,
    tone: 'text-warning bg-warning-subtle border-warning/20',
  },
]

const EARNING_EXAMPLES = [
  {
    route: 'Mumbai ↔ Pune',
    transport: 'Car / Bus / Train',
    capacity: '8 kg capacity',
    earnings: '₹500 – ₹850',
    impact: 'Covers toll charges & highway fuel',
    icon: Truck,
  },
  {
    route: 'Delhi ↔ Jaipur',
    transport: 'Train / Car',
    capacity: '10 kg capacity',
    earnings: '₹600 – ₹1,100',
    impact: 'Pays for your AC chair car train ticket',
    icon: Train,
  },
  {
    route: 'Bangalore ↔ Hyderabad',
    transport: 'Flight / Car',
    capacity: '5 kg lightweight',
    earnings: '₹900 – ₹1,800',
    impact: 'Offsets airport cab fares & travel meals',
    icon: Plane,
  },
]

const TRAVELER_FAQS = [
  {
    q: 'How do I know the parcel is safe and legal to carry?',
    a: 'CarryGo has a strict prohibited items policy. Furthermore, every traveler is empowered with the Right of Inspection: you personally check and inspect package contents before entering the pickup OTP. Senders must keep packages unsealed until verified by you.',
  },
  {
    q: 'When and how do I receive my payout?',
    a: 'Fares are held securely in CarryGo escrow from the moment a request is matched. As soon as the recipient gives you their delivery OTP and you confirm the dropoff in your app, the funds are instantly credited to your CarryGo wallet and can be withdrawn via UPI or bank account.',
  },
  {
    q: 'What if the recipient does not show up at the destination?',
    a: 'Both sender and traveler stay in touch via in-app chat. If a recipient is unreachable, our 24/7 support team assists in coordinating alternative handover points or facilitates safe parcel return with compensated waiting and return fees.',
  },
]

export default function ForTravelersPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24">
        <PageHero
          badge="For Verified Travelers"
          title="Turn Empty Luggage Space into Travel Income"
          description="Whether you commute weekly by train, drive between cities, or fly for business, CarryGo lets you earn by carrying verified packages on routes you are already taking."
          illustrationSrc="/images/custom/traveler-earnings.svg"
          illustrationAlt="Traveler earnings illustration"
          illustrationLabel="Monetize your journey"
          actions={[
            { label: 'Post a Travel Plan', href: '/create-trip' },
            { label: 'Browse Open Parcels', href: '/search?type=parcels', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      {/* Benefits Grid */}
      <ScrollLinkedSection className="px-4 pb-12 sm:px-6">
        <SectionHeading
          label="Traveler Advantages"
          title="Earn Safely on Your Terms"
          description="CarryGo protects travelers with mandatory sender ID checks, pre-funded escrow vaults, and complete package inspection authority."
        />

        <div className="mx-auto mt-12 grid w-full max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {travelerBenefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div key={benefit.title} className="rounded-3xl bg-surface border border-border p-6 space-y-3 shadow-xs">
                <div className={`inline-flex p-3 rounded-2xl border ${benefit.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-heading font-bold text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted">{benefit.description}</p>
              </div>
            )
          })}
        </div>
      </ScrollLinkedSection>

      {/* Real Earning Potential Cards */}
      <ScrollLinkedSection className="px-4 py-12 sm:px-6 md:py-16 bg-surface-elevated/40 border-y border-border/70">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="Real Earnings"
            title="How Much Can You Offset on Popular Corridors?"
            description="Typical payouts earned by verified travelers carrying small packages and document envelopes."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {EARNING_EXAMPLES.map((example) => {
              const Icon = example.icon
              return (
                <div key={example.route} className="rounded-3xl bg-surface border border-border p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Icon className="w-4 h-4 text-primary" />
                      {example.transport}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-subtle text-primary">
                      {example.capacity}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-heading font-bold text-foreground">
                      {example.route}
                    </h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-2xl sm:text-3xl font-heading font-extrabold text-primary">
                        {example.earnings}
                      </span>
                      <span className="text-xs text-muted">/ trip payout</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted leading-relaxed pt-2 border-t border-border flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    <span>{example.impact}</span>
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </ScrollLinkedSection>

      {/* Traveler Verification & Safety Protocol */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
              <UserCheck className="w-3.5 h-3.5" />
              <span>KYC Verification Process</span>
            </span>

            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground tracking-tight">
              Get Verified as a CarryGo Trusted Traveler in 3 Minutes
            </h2>

            <p className="text-sm text-muted leading-relaxed">
              We maintain high trust by thoroughly verifying every traveler before they can view and accept parcel deliveries.
            </p>

            <div className="space-y-3 pt-2">
              {[
                {
                  title: '1. Government ID Verification',
                  desc: 'Submit your Aadhaar, Passport, or Driving License. Encrypted and validated in real time.',
                },
                {
                  title: '2. Live Liveness Selfie Check',
                  desc: 'A quick facial scan confirms that you match your identification documents.',
                },
                {
                  title: '3. Instant Account Activation',
                  desc: 'Once reviewed, you can post unlimited trips and accept matching delivery requests.',
                },
              ].map((step) => (
                <div key={step.title} className="p-3.5 rounded-2xl bg-surface border border-border">
                  <div className="text-xs font-bold text-foreground">{step.title}</div>
                  <p className="text-[11px] text-muted mt-0.5">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Traveler FAQs */}
          <div className="space-y-4 rounded-3xl bg-surface border border-border p-6 sm:p-8">
            <h3 className="text-xl font-heading font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h3>

            {TRAVELER_FAQS.map((faq) => (
              <div key={faq.q} className="border-b border-border/70 pb-4 last:border-b-0 space-y-1.5">
                <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-muted leading-relaxed pl-5">{faq.a}</p>
              </div>
            ))}

            <div className="pt-4">
              <Link
                href="/create-trip"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-xs bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm transition"
              >
                <span>Post a Trip &amp; Start Earning</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}
