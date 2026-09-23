import Link from 'next/link'
import { CheckCheck, Sparkles, Shield, ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/marketing/animated-reveal'
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
          {plans.map((plan, index) => (
            <Reveal key={plan.name} delay={index * 0.08}>
              <article
                className={`sturdy-card p-6 md:p-8 h-full flex flex-col justify-between ${
                  plan.highlight ? 'border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <InteractiveIconBadge tone={plan.tone} className="w-12 h-12">
                      {plan.iconType === 'package' && <AnimatedPackageDelivery size={28} color="#D97706" />}
                      {plan.iconType === 'vault' && <AnimatedWalletVault size={28} color="#059669" />}
                      {plan.iconType === 'shield' && <AnimatedShieldBeacon size={28} color="#0284C7" />}
                    </InteractiveIconBadge>

                    {plan.highlight && (
                      <span className='inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200'>
                        <Sparkles className="w-3 h-3 text-emerald-600" /> Most Popular
                      </span>
                    )}
                  </div>

                  <h3 className='text-2xl font-heading font-bold text-slate-900'>{plan.name}</h3>
                  <p className='mt-1 text-sm text-slate-500'>{plan.subtitle}</p>
                  <p className='mt-5 text-4xl font-heading font-extrabold tracking-tight text-slate-900'>{plan.price}</p>
                  <p className='mt-1 text-xs text-slate-500 font-medium'>{plan.cadence}</p>
                  <ul className='mt-6 space-y-2.5 pt-4 border-t border-slate-100'>
                    {plan.features.map((feature) => (
                      <li key={feature} className='flex items-center gap-2 text-sm text-slate-700 font-normal'>
                        <CheckCheck className='h-4 w-4 text-emerald-600 shrink-0' />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-auto">
                  <Link
                    href={plan.name === 'Business' ? '/contact' : '/create-parcel'}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center inline-flex items-center justify-center gap-1.5 transition ${
                      plan.highlight
                        ? 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <span>{plan.name === 'Business' ? 'Contact Sales' : 'Get Started'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-4 sm:px-6 pt-12 pb-24'>
        <div className='mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-2'>
          <Reveal delay={0.05}>
            <article className='sturdy-card p-6 md:p-8 h-full flex flex-col justify-between'>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <AnimatedWalletVault size={32} color="#059669" />
                  <h3 className='text-2xl font-heading font-bold text-slate-900'>Pricing &amp; SafeVault™ Guarantee</h3>
                </div>
                <ul className='space-y-3 text-sm text-slate-600 font-normal'>
                  {feeNotes.map((note) => (
                    <li key={note} className='flex items-start gap-2.5'>
                      <Sparkles className='mt-1 h-3.5 w-3.5 text-emerald-600 shrink-0' />
                      <span className="leading-relaxed">{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.1}>
            <article className='sturdy-card p-6 md:p-8 flex flex-col justify-between border-emerald-500/20 bg-gradient-to-br from-white to-emerald-50/20 h-full'>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-3 border border-emerald-200">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bespoke Concierge Logistics</span>
                </div>
                <h3 className='text-2xl font-heading font-bold text-slate-900'>Need a bespoke enterprise concierge?</h3>
                <p className='mt-3 text-sm leading-relaxed text-slate-600 font-normal'>
                  We support private route networks, dedicated team onboarding, priority SLAs, and customized analytics for high-volume operations.
                </p>
              </div>
              <div className="pt-6 mt-auto">
                <Link
                  href='/contact'
                  className='button-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 text-center'
                >
                  <span>Connect with Concierge</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          </Reveal>
        </div>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}








