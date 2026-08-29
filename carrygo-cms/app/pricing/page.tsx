import Link from 'next/link'
import { CheckCheck, Sparkles } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'

const plans = [
  {
    name: 'Essential',
    subtitle: 'For occasional personal shipping',
    price: '₹149',
    cadence: '/delivery + variable route fee',
    features: ['Verified traveler matching', 'OTP-based handover', 'In-app status tracking'],
    highlight: false,
  },
  {
    name: 'Smart',
    subtitle: 'For frequent senders and SMBs',
    price: '₹399',
    cadence: '/month platform pass + lower route fee',
    features: ['Priority matching windows', 'Advanced tracking milestones', 'Faster support turnaround'],
    highlight: true,
  },
  {
    name: 'Business',
    subtitle: 'For high-volume operations teams',
    price: 'Custom',
    cadence: 'based on routes and volume',
    features: ['Workflow customization', 'Account management support', 'Operational reporting visibility'],
    highlight: false,
  },
]

const feeNotes = [
  'Final delivery pricing depends on parcel weight, route demand, and urgency window.',
  'Traveler payout and platform charge are visible before booking confirmation.',
  'Dispute and refund handling follows policy and logged event evidence.',
]

export default function PricingPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <PageHero
          badge='Pricing'
          title='Transparent Plans for Individuals and Growing Teams'
          description='Choose the structure that matches your shipment volume while keeping trust and delivery quality uncompromised.'
          illustrationSrc='/images/custom/sender-operations.svg'
          illustrationAlt='Custom pricing operations illustration'
          illustrationLabel='Clear pricing for every segment'
          actions={[
            { label: 'Contact for Business Plan', href: '/contact' },
            { label: 'Read Refund Policy', href: '/refund-cancellation', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-12'>
        <SectionHeading
          label='Plans'
          title='Simple pricing, clear value'
          description='All plans include secure handovers, verified traveler access, and policy-backed support.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`glass-card p-7 ${plan.highlight ? 'border-primary/40 shadow-xl shadow-primary/10' : ''}`}
            >
              {plan.highlight && (
                <span className='inline-flex rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary'>
                  Most Popular
                </span>
              )}
              <h3 className='mt-4 text-2xl font-heading font-semibold text-foreground'>{plan.name}</h3>
              <p className='mt-1 text-sm text-muted'>{plan.subtitle}</p>
              <p className='mt-5 text-4xl font-heading font-bold tracking-tight text-foreground'>{plan.price}</p>
              <p className='mt-1 text-sm text-muted'>{plan.cadence}</p>
              <ul className='mt-6 space-y-2'>
                {plan.features.map((feature) => (
                  <li key={feature} className='flex items-center gap-2 text-sm text-muted'>
                    <CheckCheck className='h-4 w-4 text-success' />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pt-12 pb-24'>
        <div className='mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-2'>
          <article className='glass-card p-8'>
            <h3 className='text-2xl font-heading font-semibold text-foreground'>Pricing notes</h3>
            <ul className='mt-5 space-y-3 text-sm text-muted'>
              {feeNotes.map((note) => (
                <li key={note} className='flex items-start gap-2'>
                  <Sparkles className='mt-0.5 h-4 w-4 text-primary' />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className='glass-card p-8'>
            <h3 className='text-2xl font-heading font-semibold text-foreground'>Need a custom enterprise setup?</h3>
            <p className='mt-4 text-sm leading-relaxed text-muted'>
              We support custom route governance, team onboarding, and reporting requirements for larger operations.
            </p>
            <Link
              href='/contact'
              className='mt-6 inline-flex items-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover'
            >
              Talk to Enterprise Team
            </Link>
          </article>
        </div>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}







