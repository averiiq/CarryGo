import Link from 'next/link'
import { CheckCheck, Sparkles, Shield, ArrowRight } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { createMarketingMetadata } from '@/lib/marketing-metadata'
import {
  AnimatedWalletVault,
  AnimatedPackageDelivery,
  AnimatedShieldBeacon,
  InteractiveIconBadge,
} from '@/components/ui/animated-icons'

export const metadata = createMarketingMetadata('Pricing', 'Understand CarryGo pricing principles and available delivery options.', '/pricing')

const plans = [
  {
    name: 'Essential',
    subtitle: 'For occasional personal shipping',
    price: '₹149',
    cadence: '/delivery + variable route fee',
    features: ['Verified traveler matching', 'OTP-based handover', 'In-app status tracking'],
    highlight: false,
    tone: 'amber' as const,
    iconType: 'package' as const,
  },
  {
    name: 'Smart',
    subtitle: 'For frequent senders and SMBs',
    price: '₹399',
    cadence: '/month platform pass + lower route fee',
    features: ['Priority matching windows', 'Advanced tracking milestones', 'Faster support turnaround'],
    highlight: true,
    tone: 'emerald' as const,
    iconType: 'vault' as const,
  },
  {
    name: 'Business',
    subtitle: 'For high-volume operations teams',
    price: 'Custom',
    cadence: 'based on routes and volume',
    features: ['Workflow customization', 'Account management support', 'Operational reporting visibility'],
    highlight: false,
    tone: 'sky' as const,
    iconType: 'shield' as const,
  },
]

const feeNotes = [
  'Final delivery pricing depends on package dimensions, route popularity, and preferred travel window.',
  'Traveler reward and platform contribution are fully transparent before booking confirmation.',
  'Concierge refund and care handling follows transparent guidelines and verified journey records.',
]

export default function PricingPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-4 sm:px-6 py-16 md:py-24'>
        <PageHero
          badge='Pricing'
          title='Transparent Plans for Individuals and Growing Teams'
          description='Choose the structure that matches your shipment volume while keeping trust and delivery quality uncompromised.'
          illustrationSrc="/images/abstract/smart-pricing.jpg"
          illustrationAlt="Minimalist 3D architectural balance scale in white ceramic and satin brass"
          illustrationLabel="Smart Journey Valuation"
          actions={[
            { label: 'Contact for Business Plan', href: '/contact' },
            { label: 'Read Refund Policy', href: '/refund-cancellation', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-4 sm:px-6 pb-12'>
        <SectionHeading
          label='Plans'
          title='Simple pricing, clear value'
          description='All plans include Golden Handshake protection, verified travel companion matching, and concierge care.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3 [&>*:last-child]:col-span-1 sm:[&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1'>
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`glass-card p-6 md:p-7 transition-all duration-300 hover:translate-y-[-2px] ${
                plan.highlight ? 'border-primary/50 shadow-xl shadow-primary/10 ring-1 ring-primary/20' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <InteractiveIconBadge tone={plan.tone} className="w-12 h-12">
                  {plan.iconType === 'package' && <AnimatedPackageDelivery size={28} color="#D97706" />}
                  {plan.iconType === 'vault' && <AnimatedWalletVault size={28} color="#059669" />}
                  {plan.iconType === 'shield' && <AnimatedShieldBeacon size={28} color="#0284C7" />}
                </InteractiveIconBadge>

                {plan.highlight && (
                  <span className='inline-flex items-center gap-1 rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary border border-primary/25'>
                    <Sparkles className="w-3 h-3 text-primary" /> Most Popular
                  </span>
                )}
              </div>

              <h3 className='text-2xl font-heading font-semibold text-foreground'>{plan.name}</h3>
              <p className='mt-1 text-sm text-muted'>{plan.subtitle}</p>
              <p className='mt-5 text-4xl font-heading font-bold tracking-tight text-foreground'>{plan.price}</p>
              <p className='mt-1 text-sm text-muted'>{plan.cadence}</p>
              <ul className='mt-6 space-y-2.5'>
                {plan.features.map((feature) => (
                  <li key={feature} className='flex items-center gap-2 text-sm text-muted'>
                    <CheckCheck className='h-4 w-4 text-emerald-600 shrink-0' />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-4 sm:px-6 pt-12 pb-24'>
        <div className='mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-2'>
          <article className='glass-card p-6 md:p-8 relative overflow-hidden'>
            <div className="flex items-center gap-3 mb-4">
              <AnimatedWalletVault size={32} color="#059669" />
              <h3 className='text-2xl font-heading font-semibold text-foreground'>Pricing &amp; SafeVault™ Guarantee</h3>
            </div>
            <ul className='space-y-3 text-sm text-muted'>
              {feeNotes.map((note) => (
                <li key={note} className='flex items-start gap-2.5'>
                  <Sparkles className='mt-1 h-3.5 w-3.5 text-primary shrink-0' />
                  <span className="leading-relaxed">{note}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className='glass-card p-6 md:p-8 flex flex-col justify-between border-primary/20 bg-gradient-to-br from-surface to-primary-subtle/20'>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-subtle text-primary text-xs font-semibold mb-3 border border-primary/20">
                <Shield className="w-3.5 h-3.5" />
                <span>Bespoke Concierge Logistics</span>
              </div>
              <h3 className='text-2xl font-heading font-semibold text-foreground'>Need a bespoke enterprise concierge?</h3>
              <p className='mt-3 text-sm leading-relaxed text-muted'>
                We support private route networks, dedicated team onboarding, priority SLAs, and customized analytics for high-volume operations.
              </p>
            </div>
            <Link
              href='/contact'
              className='button-primary mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 text-center'
            >
              <span>Connect with Concierge</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </article>
        </div>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}








