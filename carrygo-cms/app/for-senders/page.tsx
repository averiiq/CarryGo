import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  FileCheck2,
  IndianRupee,
  KeyRound,
  Lock,
  Package,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata(
  'For Senders — Fast & Secure Intercity Parcel Delivery',
  'Ship urgent documents, electronics, and packages with verified travelers heading to your destination. Save up to 60% compared to traditional couriers.',
  '/for-senders'
)

const senderBenefits = [
  {
    title: 'Same-Day / Next-Day Delivery',
    description: 'Bypass courier warehouse sorting hubs. Your package travels directly with someone already taking that flight, train, or drive.',
    icon: Zap,
    tone: 'text-primary bg-primary-subtle border-primary/20',
  },
  {
    title: 'Protected Escrow Payments',
    description: 'Your payment is safely locked in CarryGo escrow vault and only released when your recipient verifies delivery via OTP.',
    icon: Lock,
    tone: 'text-success bg-success-subtle border-success/20',
  },
  {
    title: 'Dual-OTP In-Person Handover',
    description: 'You get a pickup OTP at collection and your recipient holds the delivery OTP. Zero package mishandling or lost drops.',
    icon: KeyRound,
    tone: 'text-accent bg-accent-subtle border-accent/20',
  },
  {
    title: 'Up to 60% Cost Savings',
    description: 'Save significantly compared to priority same-day air couriers while helping a verified traveler offset their travel expenses.',
    icon: TrendingDown,
    tone: 'text-warning bg-warning-subtle border-warning/20',
  },
]

const PERMITTED_ITEMS = [
  'Business contracts, legal documents & passports',
  'Laptops, tablets, smartphones & electronics (properly packed)',
  'Apparel, footwear, fashion accessories & gifts',
  'Prescription medicines (with valid doctor prescription)',
  'Packaged non-perishable regional delicacies & dry snacks',
  'Keys, forgotten personal essentials & luggage items',
]

const PROHIBITED_ITEMS = [
  'Illegal substances, narcotics, or unregulated chemicals',
  'Flammables, explosives, lighters, or hazardous materials',
  'Weapons, firearms, ammunition, or replica weapons',
  'Uncooked perishables, raw meat, or items prone to spoilage',
  'Cash currency, bullion, bearer bonds, or jewelry worth >₹50,000',
  'Any item prohibited by Indian transport or aviation regulations',
]

const SENDER_FAQS = [
  {
    q: 'How does the traveler receive my package?',
    a: 'You coordinate a convenient public meeting point (e.g., railway station, airport gate, metro station, or your doorstep). The traveler inspects the item contents, and you confirm pickup by sharing your 4-digit pickup OTP.',
  },
  {
    q: 'What if the traveler cancels or delays their trip?',
    a: 'Your escrow payment is never charged until delivery is completed. If a trip is cancelled before pickup, your locked funds are immediately 100% refunded with zero cancellation penalty.',
  },
  {
    q: 'How do I know my package will reach the right person?',
    a: 'The traveler cannot complete the delivery without inputting the unique 4-digit Delivery OTP that is only sent to your designated recipient’s phone number upon delivery arrival.',
  },
]

export default function ForSendersPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24">
        <PageHero
          badge="For Senders"
          title="Ship Packages Intercity in Hours, Not Days"
          description="Connect directly with verified travelers on flights, trains, and highway routes. Get your urgent parcel to its destination with speed, full visibility, and escrow protection."
          illustrationSrc="/images/custom/sender-operations.svg"
          illustrationAlt="Sender operations illustration"
          illustrationLabel="Peer-to-peer delivery network"
          actions={[
            { label: 'Post a Parcel Request', href: '/create-parcel' },
            { label: 'Find Available Travelers', href: '/search', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      {/* Benefits Grid */}
      <ScrollLinkedSection className="px-4 pb-12 sm:px-6">
        <SectionHeading
          label="Why Senders Love CarryGo"
          title="Designed for Speed, Security, and Peace of Mind"
          description="Traditional couriers take 3 to 5 days with packages changing hands through dozens of depots. CarryGo connects you directly to the person traveling."
        />

        <div className="mx-auto mt-12 grid w-full max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {senderBenefits.map((benefit) => {
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

      {/* What You Can & Cannot Ship (Crucial for trust) */}
      <ScrollLinkedSection className="px-4 py-12 sm:px-6 md:py-16 bg-surface-elevated/40 border-y border-border/70">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="Safety Guidelines"
            title="What Can You Send with CarryGo?"
            description="Clear compliance standards protect both senders and travelers across every transit corridor."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Permitted Items */}
            <div className="rounded-3xl bg-surface border border-success/30 p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 text-success font-heading font-bold text-lg">
                <CheckCircle2 className="w-5 h-5" />
                <span>Permitted Items</span>
              </div>
              <ul className="space-y-3 pt-2">
                {PERMITTED_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-xs text-muted leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Prohibited Items */}
            <div className="rounded-3xl bg-surface border border-danger/30 p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 text-danger font-heading font-bold text-lg">
                <Ban className="w-5 h-5" />
                <span>Strictly Prohibited Items</span>
              </div>
              <ul className="space-y-3 pt-2">
                {PROHIBITED_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-xs text-muted leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-danger shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </ScrollLinkedSection>

      {/* Sender FAQs */}
      <ScrollLinkedSection className="px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-4xl space-y-6">
          <SectionHeading
            label="Frequently Asked Questions"
            title="Common Questions from Senders"
            description="Everything you need to know before booking your first peer-to-peer delivery."
          />

          <div className="mt-10 space-y-4">
            {SENDER_FAQS.map((faq) => (
              <div key={faq.q} className="rounded-2xl bg-surface border border-border p-5 space-y-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-muted leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>

          <div className="pt-8 text-center">
            <Link
              href="/create-parcel"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary-hover shadow-md hover:shadow-lg transition-all"
            >
              <span>Post a Parcel Request Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}
