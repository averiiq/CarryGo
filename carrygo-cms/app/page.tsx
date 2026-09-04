import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Box,
  CircleDollarSign,
  Handshake,
  MessagesSquare,
  PlaneTakeoff,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react'
import { Reveal } from '@/components/marketing/animated-reveal'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { quickStats, testimonials } from '@/components/marketing/site-data'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata('Trusted Parcel Delivery Network', 'Connect with verified travelers for secure, route-based parcel delivery.', '/')

const featurePillars = [
  {
    title: 'Smart Route Matching',
    description: 'Route-aware matching identifies suitable travelers by destination, timing, and available capacity.',
    icon: PlaneTakeoff,
    tone: 'text-primary bg-primary-subtle',
  },
  {
    title: 'Secure Handover Protocol',
    description: 'OTP checkpoints and event logs reduce risk from pickup to final drop confirmation.',
    icon: ShieldCheck,
    tone: 'text-success bg-success-subtle',
  },
  {
    title: 'Transparent Pricing',
    description: 'See delivery fee, traveler payout, and protection costs before confirming requests.',
    icon: WalletCards,
    tone: 'text-accent bg-accent-subtle',
  },
]

const appParityFeatures = [
  { title: 'Create Trip & Parcel', description: 'Post travel plans or delivery requests with route, date, and capacity details.', icon: Route },
  { title: 'Smart Search Feed', description: 'Discover relevant trips/parcels using filters and confidence-based matching.', icon: Search },
  { title: 'Requests Workflow', description: 'Send, accept, reject, and track request states in one flow.', icon: BadgeCheck },
  { title: 'Real-time Chat', description: 'Coordinate handover and updates in conversation threads.', icon: MessagesSquare },
  { title: 'Payments & Wallet', description: 'Track escrow, release, refunds, and payout signals clearly.', icon: CircleDollarSign },
  { title: 'Alerts & Updates', description: 'Stay informed at every milestone with in-app style notifications.', icon: BellRing },
]

const journeySteps = [
  {
    title: 'Create Request',
    description: 'Add parcel details, route, and timeline in less than two minutes.',
  },
  {
    title: 'Pick Trusted Match',
    description: 'Choose verified travelers using route confidence and reputation signals.',
  },
  {
    title: 'Track & Confirm',
    description: 'Monitor milestones and close with OTP-secured delivery confirmation.',
  },
]

const personaCards = [
  {
    title: 'For Senders',
    description: 'Ship urgent parcels faster without premium courier overhead.',
    href: '/for-senders',
    icon: Box,
    image: '/images/custom/sender-operations.svg',
  },
  {
    title: 'For Travelers',
    description: 'Monetize planned routes with structured payouts and safety controls.',
    href: '/for-travelers',
    icon: Handshake,
    image: '/images/custom/traveler-earnings.svg',
  },
]

export default function LandingPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 pt-16 pb-16 md:pt-24 md:pb-24'>
        <PageHero
          badge='CarryGo App Experience, Recreated for Web'
          title='Website UI with the Same Feel as Your Mobile App'
          description='CarryGo web now follows the same trust-first visual language and product workflows used in the app: matching, requests, tracking, chat, and payout visibility.'
          illustrationSrc='/images/custom/hero-logistics.svg'
          illustrationAlt='CarryGo logistics illustration'
          illustrationLabel='Design system aligned to the mobile app'
          actions={[
            { label: 'Explore App Features', href: '/features' },
            { label: 'Open Dashboard', href: '/dashboard', variant: 'secondary' },
          ]}
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {quickStats.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.05}>
              <div className='glass-card rounded-3xl p-6 text-center'>
                <p className='text-3xl font-heading font-bold tracking-tight text-foreground'>{stat.value}</p>
                <p className='mt-1 text-xs font-medium uppercase tracking-[0.12em] text-muted'>{stat.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <SectionHeading
          label='App Feature Parity'
          title='Core mobile product capabilities now reflected on website'
          description='These surfaces mirror the same functional experience users already trust in the app.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3'>
          {appParityFeatures.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.05}>
              <article className='glass-card rounded-3xl p-6 md:p-7'>
                <div className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-subtle text-primary'>
                  <feature.icon className='h-5 w-5' />
                </div>
                <h3 className='mt-4 text-lg font-heading font-semibold text-foreground'>{feature.title}</h3>
                <p className='mt-2 text-sm leading-relaxed text-muted'>{feature.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <SectionHeading
          label='Core Pillars'
          title='Trust-first design language from the app'
          description='Visual hierarchy, cards, actions, and state colors now follow the same mobile design intent.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {featurePillars.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 0.08}>
              <article className='glass-card rounded-3xl p-6 md:p-7'>
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${pillar.tone}`}>
                  <pillar.icon className='h-5 w-5' />
                </div>
                <h3 className='mt-4 text-lg font-heading font-semibold text-foreground'>{pillar.title}</h3>
                <p className='mt-2 text-sm leading-relaxed text-muted'>{pillar.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <SectionHeading
          label='Workflow'
          title='Designed for senders and travelers'
          description='CarryGo aligns incentives and outcomes for both sides of every route.'
        />

        <div className='mx-auto mt-11 grid w-full max-w-6xl gap-5 md:grid-cols-2'>
          {personaCards.map((card, index) => (
            <Reveal key={card.title} delay={index * 0.06}>
              <article className='glass-card group space-y-4 rounded-3xl p-6 md:p-8'>
                <div className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-solid text-primary'>
                  <card.icon className='h-5 w-5' />
                </div>
                <h3 className='text-2xl font-heading font-semibold text-foreground'>{card.title}</h3>
                <p className='text-base leading-relaxed text-muted'>{card.description}</p>
                <div className='overflow-hidden rounded-2xl border border-border/70 bg-background/60 p-2'>
                  <Image src={card.image} alt={`${card.title} visual`} width={900} height={560} className='aspect-[16/10] w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.02]' />
                </div>
                <Link href={card.href} className='inline-link'>
                  Explore {card.title}
                  <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <SectionHeading
          label='Delivery Flow'
          title='Simple 3-step operational journey'
          description='The same creation to completion journey used in the app is now clearly represented on web.'
        />

        <div className='mx-auto mt-12 max-w-6xl'>
          <div className='grid gap-5 md:grid-cols-3'>
            {journeySteps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.06}>
                <article className='glass-card rounded-3xl p-6 md:p-7'>
                  <div className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/25 bg-primary-subtle text-sm font-semibold text-primary'>
                    {index + 1}
                  </div>
                  <h3 className='mt-4 text-lg font-heading font-semibold text-foreground'>{step.title}</h3>
                  <p className='mt-2 text-sm leading-relaxed text-muted'>{step.description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <SectionHeading
          label='Designed for real workflows'
          title='Built around the needs of every participant'
          description='Explore how CarryGo supports common delivery and travel scenarios.'
        />

        <div className='mx-auto mt-11 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {testimonials.map((testimonial, index) => (
            <Reveal key={testimonial.name} delay={index * 0.05}>
              <article className='glass-card space-y-4 rounded-3xl p-6 md:p-7'>
                <Sparkles className='h-5 w-5 text-primary' />
                <p className='text-sm leading-relaxed text-muted'>{testimonial.quote}</p>
                <div>
                  <p className='text-sm font-semibold text-foreground'>{testimonial.name}</p>
                  <p className='text-xs text-muted'>{testimonial.role}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pt-14 pb-24 md:pt-16 md:pb-24'>
        <Reveal>
          <div className='glass-card mx-auto grid w-full max-w-6xl gap-6 rounded-3xl border border-primary/15 p-7 md:grid-cols-[1.1fr_0.9fr] md:items-center md:p-9'>
            <div className='max-w-3xl'>
              <p className='badge-pill'>Go Live</p>
              <h2 className='mt-3 text-3xl font-heading font-bold tracking-tight text-foreground'>Ready for full app-to-web parity?</h2>
              <p className='mt-3 text-base text-muted'>
                We can now continue with advanced parity features like role-based onboarding flows, richer chat UI, and route intelligence previews.
              </p>
              <div className='mt-6 flex flex-wrap gap-3'>
                <Link href='/features' className='button-primary group'>
                  View All Features
                  <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                </Link>
                <Link href='/contact' className='button-secondary'>
                  Plan Implementation
                </Link>
              </div>
            </div>

            <div className='overflow-hidden rounded-3xl border border-border/70 bg-background/70 p-3'>
              <Image src='/images/custom/support-center.svg' alt='Support center illustration' width={760} height={520} className='aspect-[4/3] w-full rounded-2xl object-cover' />
            </div>
          </div>
        </Reveal>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}
