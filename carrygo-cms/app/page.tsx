import Link from 'next/link'
import { ArrowRight, Box, Handshake, PlaneTakeoff, ShieldCheck, Sparkles, WalletCards } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { SectionHeading } from '@/components/marketing/section-heading'
import { quickStats, testimonials } from '@/components/marketing/site-data'

const featurePillars = [
  {
    title: 'Smart Route Matching',
    description:
      'AI-assisted route intelligence finds the best traveler match across availability, reliability, and ETA confidence.',
    icon: PlaneTakeoff,
    tone: 'text-primary bg-primary-subtle',
  },
  {
    title: 'Secure Handover Protocol',
    description: 'OTP checkpoints and event logs reduce risk from pickup to final drop.',
    icon: ShieldCheck,
    tone: 'text-success bg-success-subtle',
  },
  {
    title: 'Transparent Pricing',
    description: 'See delivery fees, traveler payout, and protection costs before confirmation.',
    icon: WalletCards,
    tone: 'text-accent bg-accent-subtle',
  },
]

const journeySteps = [
  {
    title: 'Create Request',
    description: 'Add parcel details, route, and delivery window in less than two minutes.',
  },
  {
    title: 'Pick Trusted Match',
    description: 'Choose verified travelers using route confidence and reliability signals.',
  },
  {
    title: 'Track & Confirm',
    description: 'Use OTP-secured handovers and live milestone updates till delivery.',
  },
]

const personaCards = [
  {
    title: 'For Senders',
    description: 'Ship urgent parcels faster without premium courier overhead.',
    href: '/for-senders',
    icon: Box,
  },
  {
    title: 'For Travelers',
    description: 'Monetize planned routes with structured payouts and safety controls.',
    href: '/for-travelers',
    icon: Handshake,
  },
]

export default function LandingPage() {
  return (
    <MarketingShell>
      <section className='px-6 pt-14 pb-20 md:pt-20'>
        <PageHero
          badge='Trusted Peer-to-Peer Delivery Network'
          title='Move Parcels with Verified Travelers, Not Uncertainty'
          description='CarryGo combines elegant UX, secure workflows, and route intelligence to deliver parcels quickly and safely.'
          actions={[
            { label: 'Explore Features', href: '/features' },
            { label: 'See Pricing', href: '/pricing', variant: 'secondary' },
          ]}
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {quickStats.map((stat) => (
            <div key={stat.label} className='glass-card p-6 text-center'>
              <p className='text-3xl font-heading font-bold tracking-tight text-foreground'>{stat.value}</p>
              <p className='mt-1 text-sm text-muted'>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className='px-6 py-16 md:py-20'>
        <SectionHeading
          label='Capability Stack'
          title='Purpose-built for modern parcel movement'
          description='From discovery and matching to secure handovers and audit-ready logs, each step is engineered for trust and speed.'
        />
        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {featurePillars.map((pillar) => (
            <article key={pillar.title} className='glass-card space-y-4 p-7'>
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${pillar.tone}`}>
                <pillar.icon className='h-5 w-5' />
              </div>
              <h3 className='text-xl font-heading font-semibold text-foreground'>{pillar.title}</h3>
              <p className='text-sm leading-relaxed text-muted'>{pillar.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className='px-6 py-16 md:py-20'>
        <SectionHeading
          label='How It Works'
          title='Three steps from booking to confirmation'
          description='Simple experience for users, strong controls for secure operations.'
        />

        <div className='mx-auto mt-11 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {journeySteps.map((step, index) => (
            <article key={step.title} className='glass-card p-7'>
              <div className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white'>
                {index + 1}
              </div>
              <h3 className='mt-4 text-lg font-heading font-semibold text-foreground'>{step.title}</h3>
              <p className='mt-2 text-sm leading-relaxed text-muted'>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className='px-6 py-16 md:py-20'>
        <SectionHeading
          label='Audience'
          title='Designed for senders and travelers'
          description='CarryGo aligns incentives and outcomes for both sides of every route.'
        />

        <div className='mx-auto mt-11 grid w-full max-w-6xl gap-5 md:grid-cols-2'>
          {personaCards.map((card) => (
            <article key={card.title} className='glass-card space-y-4 p-8'>
              <div className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-solid text-primary'>
                <card.icon className='h-5 w-5' />
              </div>
              <h3 className='text-2xl font-heading font-semibold text-foreground'>{card.title}</h3>
              <p className='text-base leading-relaxed text-muted'>{card.description}</p>
              <Link href={card.href} className='inline-flex items-center gap-2 text-sm font-semibold text-primary transition-opacity hover:opacity-80'>
                Explore {card.title}
                <ArrowRight className='h-4 w-4' />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className='px-6 py-16 md:py-20'>
        <SectionHeading
          label='Trusted by Users'
          title='What people say after switching to CarryGo'
          description='Teams and individual travelers value the speed, transparency, and safety.'
        />

        <div className='mx-auto mt-11 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className='glass-card space-y-4 p-7'>
              <Sparkles className='h-5 w-5 text-primary' />
              <p className='text-sm leading-relaxed text-muted'>{testimonial.quote}</p>
              <div>
                <p className='text-sm font-semibold text-foreground'>{testimonial.name}</p>
                <p className='text-xs text-muted'>{testimonial.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className='px-6 pb-20 pt-16'>
        <div className='mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-subtle via-surface to-accent-subtle p-9 md:flex-row md:items-center md:justify-between'>
          <div className='max-w-3xl'>
            <p className='text-sm font-semibold uppercase tracking-[0.2em] text-primary'>Get Started</p>
            <h2 className='mt-3 text-3xl font-heading font-bold tracking-tight text-foreground'>Ready to deliver with confidence?</h2>
            <p className='mt-3 text-base text-muted'>
              Launch faster parcel operations with a professional experience for senders, travelers, and operations teams.
            </p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Link href='/contact' className='inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover'>
              Talk to Team
              <ArrowRight className='h-4 w-4' />
            </Link>
            <Link href='/how-it-works' className='inline-flex items-center rounded-2xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary'>
              View Full Workflow
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}

