import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Box, Handshake, PlaneTakeoff, ShieldCheck, Sparkles, WalletCards } from 'lucide-react'
import { Reveal } from '@/components/marketing/animated-reveal'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { quickStats, testimonials } from '@/components/marketing/site-data'

const featurePillars = [
  {
    title: 'Smart Route Matching',
    description: 'AI-assisted route intelligence finds the best traveler match by reliability and ETA confidence.',
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
    description: 'See delivery fees, traveler payout, and protection costs before confirming requests.',
    icon: WalletCards,
    tone: 'text-accent bg-accent-subtle',
  },
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

const routeMoments = [
  {
    title: 'Urban Route Readiness',
    subtitle: 'Live city movement coverage',
    image: '/images/custom/route-network.svg',
  },
  {
    title: 'Secure Package Handover',
    subtitle: 'Policy-backed delivery checkpoints',
    image: '/images/custom/secure-handover.svg',
  },
  {
    title: 'Operational Backbone',
    subtitle: 'Reliable warehousing and dispatch',
    image: '/images/custom/warehouse-ops.svg',
  },
]

export default function LandingPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 pt-16 pb-16 md:pt-24 md:pb-24'>
        <PageHero
          badge='Trusted Peer-to-Peer Delivery Network'
          title='A More Elegant Way to Move Parcels'
          description='CarryGo blends premium product design with reliable logistics workflows to deliver parcels quickly, safely, and transparently.'
          illustrationSrc='/images/custom/hero-logistics.svg'
          illustrationAlt='Custom logistics dashboard illustration'
          illustrationLabel='Custom in-house visual system'
          actions={[
            { label: 'Explore Features', href: '/features' },
            { label: 'See Pricing', href: '/pricing', variant: 'secondary' },
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
          label='Visual Story'
          title='Grounded in real logistics moments'
          description='A modern, image-forward experience that reflects how parcel movement actually happens.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {routeMoments.map((moment, index) => (
            <Reveal key={moment.title} delay={index * 0.08}>
              <article className='glass-card group overflow-hidden rounded-3xl border border-border/70 bg-background shadow-sm'>
                <Image src={moment.image} alt={moment.title} width={960} height={680} className='aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]' />
                <div className='border-t border-border/70 p-5'>
                  <p className='text-sm font-medium text-muted'>{moment.subtitle}</p>
                  <h3 className='mt-1 text-xl font-heading font-semibold text-foreground'>{moment.title}</h3>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <SectionHeading
          label='Capability Stack'
          title='Purpose-built for modern parcel movement'
          description='From discovery and matching to secure handovers and audit-ready logs, each stage is engineered for confidence.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 lg:grid-cols-[1.2fr_0.8fr]'>
          <div className='grid gap-5 md:grid-cols-3 lg:grid-cols-1'>
            {featurePillars.map((pillar, index) => (
              <Reveal key={pillar.title} delay={index * 0.06}>
                <article className='glass-card space-y-4 rounded-3xl p-6 md:p-7'>
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${pillar.tone}`}>
                    <pillar.icon className='h-5 w-5' />
                  </div>
                  <h3 className='text-xl font-heading font-semibold text-foreground'>{pillar.title}</h3>
                  <p className='text-sm leading-relaxed text-muted'>{pillar.description}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12}>
            <article className='glass-card h-full rounded-3xl p-4'>
              <Image src='/images/custom/warehouse-ops.svg' alt='Custom warehouse operations illustration' width={900} height={1100} className='aspect-[4/5] h-full w-full rounded-2xl object-cover' />
              <div className='mt-4 flex items-center gap-2 text-sm text-muted'>
                <BadgeCheck className='h-4 w-4 text-success' />
                Live operational visibility and delivery assurance
              </div>
            </article>
          </Reveal>
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <SectionHeading
          label='How It Works'
          title='Three polished steps from booking to confirmation'
          description='Simple UX on the surface, strong operational controls underneath.'
        />

        <div className='mx-auto mt-11 grid w-full max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr]'>
          <Reveal>
            <article className='glass-card rounded-3xl p-4'>
              <Image src='/images/custom/secure-handover.svg' alt='Custom secure handover illustration' width={880} height={920} className='aspect-[4/5] w-full rounded-2xl object-cover' />
            </article>
          </Reveal>

          <div className='grid gap-5 md:grid-cols-3 lg:grid-cols-1'>
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
          label='Audience'
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
          label='Trusted by Users'
          title='What people say after switching to CarryGo'
          description='Teams and individual travelers value speed, transparency, and security.'
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
              <p className='badge-pill'>Get Started</p>
              <h2 className='mt-3 text-3xl font-heading font-bold tracking-tight text-foreground'>Ready to deliver with confidence?</h2>
              <p className='mt-3 text-base text-muted'>
                Launch faster parcel operations with a professional experience for senders, travelers, and operations teams.
              </p>
              <div className='mt-6 flex flex-wrap gap-3'>
                <Link href='/contact' className='button-primary group'>
                  Talk to Team
                  <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                </Link>
                <Link href='/how-it-works' className='button-secondary'>
                  View Full Workflow
                </Link>
              </div>
            </div>

            <div className='overflow-hidden rounded-3xl border border-border/70 bg-background/70 p-3'>
              <Image src='/images/custom/support-center.svg' alt='Custom support center illustration' width={760} height={520} className='aspect-[4/3] w-full rounded-2xl object-cover' />
            </div>
          </div>
        </Reveal>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}

