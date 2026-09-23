import { CheckCheck, ClipboardList, Handshake, MessageSquare, Route, ShieldCheck } from 'lucide-react'
import { Reveal } from '@/components/marketing/animated-reveal'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { createMarketingMetadata } from '@/lib/marketing-metadata'
import { RouteCorridorIllustration } from '@/components/illustrations/route-corridor-illustration'
import {
  AnimatedRouteNode,
  AnimatedShieldBeacon,
  AnimatedPackageDelivery,
  AnimatedWalletVault,
  InteractiveIconBadge,
} from '@/components/ui/animated-icons'

export const metadata = createMarketingMetadata('How It Works', 'See how CarryGo matches routes and coordinates secure parcel handovers.', '/how-it-works')

const senderFlow = [
  {
    title: 'Post Request',
    description: 'Describe parcel size, value, route, and preferred delivery window.',
    tone: 'amber' as const,
    icon: ClipboardList,
  },
  {
    title: 'Choose Trusted Match',
    description: 'Review verified travelers and select the best fit for your timeline.',
    tone: 'sky' as const,
    icon: Route,
  },
  {
    title: 'Golden Passkey Pickup',
    description: 'Complete personal handover with your private 4-digit passkey.',
    tone: 'emerald' as const,
    icon: Handshake,
  },
]

const deliveryFlow = [
  {
    title: 'Live Journey Milestones',
    description: 'Receive real-time journey milestones and travel progress along the route.',
    tone: 'sky' as const,
    icon: MessageSquare,
  },
  {
    title: 'Golden Handshake Signoff',
    description: 'Recipient verifies parcel condition and concludes delivery with the final golden passkey.',
    tone: 'emerald' as const,
    icon: CheckCheck,
  },
  {
    title: 'SafeVault™ Payout Release',
    description: 'Traveler earnings are deposited instantly with verified journey history.',
    tone: 'indigo' as const,
    icon: ShieldCheck,
  },
]

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-4 sm:px-6 py-16 md:py-24'>
        <PageHero
          badge='Workflow'
          title='A Clear Delivery Journey for Everyone Involved'
          description='CarryGo removes ambiguity with structured pickup, transit, and delivery operations designed around trust and speed.'
          illustrationSrc="/images/abstract/how-it-works-journey.jpg"
          illustrationAlt="Minimalist 3D travel ribbon connecting two location pins"
          illustrationLabel="Real-Time Journey Intelligence"
          actions={[
            { label: 'View Sender Experience', href: '/for-senders' },
            { label: 'View Traveler Experience', href: '/for-travelers', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      {/* Phase 1: Request to Pickup */}
      <ScrollLinkedSection className='px-4 sm:px-6 pb-12'>
        <SectionHeading
          label='Phase One'
          title='Request to pickup'
          description='Simple onboarding for senders while preserving matching quality and safety.'
        />
        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 sm:grid-cols-2 md:grid-cols-3 [&>*:last-child]:col-span-1 sm:[&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1'>
          {senderFlow.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.08}>
              <article className='sturdy-card p-6 md:p-7 flex flex-col justify-between h-full group'>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-50 text-xs font-semibold text-emerald-800 font-mono'>
                      {index + 1}
                    </div>
                    <InteractiveIconBadge tone={step.tone} className="w-10 h-10">
                      <step.icon className='h-5 w-5 text-emerald-700' />
                    </InteractiveIconBadge>
                  </div>
                  <h3 className='mt-4 text-lg font-heading font-bold text-slate-900 group-hover:text-emerald-700 transition-colors'>{step.title}</h3>
                  <p className='mt-2 text-sm leading-relaxed text-slate-600 font-normal'>{step.description}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </ScrollLinkedSection>

      {/* Live Route Corridor Simulation */}
      <ScrollLinkedSection className='px-4 sm:px-6 py-12'>
        <div className='mx-auto max-w-4xl'>
          <div className="text-center mb-8 space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold">
              <Route className="w-3.5 h-3.5 text-sky-600" />
              <span>Live Journey Pulse Simulator</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">
              Dynamic Highway &amp; Rail Waypoints
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto font-normal">
              Senders and travelers receive live milestone check-ins with automated journey updates.
            </p>
          </div>

          <RouteCorridorIllustration
            fromCity="Gurugram"
            toCity="Panipat"
            duration="1h 45m"
            distance="112 km"
          />
        </div>
      </ScrollLinkedSection>

      {/* Phase 2: Transit to Closure */}
      <ScrollLinkedSection className='px-4 sm:px-6 pt-12 pb-24'>
        <SectionHeading
          label='Phase Two'
          title='Transit to closure'
          description='Delivery progress remains visible and policy-supported through completion.'
        />
        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 sm:grid-cols-2 md:grid-cols-3 [&>*:last-child]:col-span-1 sm:[&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1'>
          {deliveryFlow.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.08}>
              <article className='sturdy-card p-6 md:p-7 flex flex-col justify-between h-full group'>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-500/25 bg-sky-50 text-xs font-semibold text-sky-800 font-mono'>
                      {index + 4}
                    </div>
                    <InteractiveIconBadge tone={step.tone} className="w-10 h-10">
                      <step.icon className='h-5 w-5 text-sky-700' />
                    </InteractiveIconBadge>
                  </div>
                  <h3 className='mt-4 text-lg font-heading font-bold text-slate-900 group-hover:text-sky-700 transition-colors'>{step.title}</h3>
                  <p className='mt-2 text-sm leading-relaxed text-slate-600 font-normal'>{step.description}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}








