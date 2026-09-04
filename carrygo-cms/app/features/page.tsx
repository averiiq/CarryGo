import {
  BellRing,
  Blocks,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  MessageSquareText,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata('Features', 'Explore CarryGo route matching, secure handovers, communication, and payment features.', '/features')

const featureCategories = [
  {
    title: 'Matching & Discovery',
    description: 'Find optimal traveler matches using route overlap, reliability, and urgency.',
    icon: Route,
    bullets: ['Route confidence scoring', 'Delivery time filtering', 'Traveler reliability signals'],
  },
  {
    title: 'Trust & Safety',
    description: 'Layered safeguards keep parcel movement auditable and secure.',
    icon: ShieldCheck,
    bullets: ['KYC verification', 'OTP pickup and drop', 'Incident escalation flow'],
  },
  {
    title: 'Financial Transparency',
    description: 'Clear pricing and wallet events for users and operations teams.',
    icon: WalletCards,
    bullets: ['Upfront fee breakup', 'Predictable payout flow', 'Dispute-backed adjustments'],
  },
]

const appFeatureParity = [
  {
    title: 'Trip & Parcel Creation',
    description: 'Same create-flow patterns as mobile for posting routes and shipment requests.',
    icon: CheckCircle2,
  },
  {
    title: 'Search & Match Feed',
    description: 'Find relevant routes/parcels using the same discovery mental model.',
    icon: Search,
  },
  {
    title: 'Request Lifecycle',
    description: 'Track pending, accepted, in-transit, and delivered states consistently.',
    icon: Clock3,
  },
  {
    title: 'Messaging & Coordination',
    description: 'In-app style communication for pickup, transit, and handover moments.',
    icon: MessageSquareText,
  },
  {
    title: 'Alerts & Milestones',
    description: 'Important status notifications surfaced at key delivery events.',
    icon: BellRing,
  },
  {
    title: 'Trust Log Trail',
    description: 'Policy-grade event tracking for dispute and support resolution.',
    icon: LockKeyhole,
  },
]

const productHighlights = [
  {
    title: 'Operations Dashboard',
    description: 'Track routes, monitor handovers, and review delivery quality from one control center.',
    icon: Blocks,
  },
  {
    title: 'Smart Notifications',
    description: 'Automated updates for matching, pickup, transit, and delivery milestones.',
    icon: MessageSquareText,
  },
  {
    title: 'Time-sensitive Routing',
    description: 'Prioritize urgent deliveries with time-aware matching and availability windows.',
    icon: Clock3,
  },
  {
    title: 'Policy-grade Logs',
    description: 'Audit-ready event trails to support refunds, disputes, and investigations.',
    icon: LockKeyhole,
  },
]

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <PageHero
          badge='Product Features'
          title='Mobile App Capabilities, Now Mirrored on Website'
          description='CarryGo web adopts the same core product experience as your app: creation flows, matching, request management, trust controls, and delivery visibility.'
          illustrationSrc='/images/custom/warehouse-ops.svg'
          illustrationAlt='Warehouse operations illustration'
          illustrationLabel='Live operational intelligence'
          actions={[
            { label: 'Explore Workflow', href: '/how-it-works' },
            { label: 'Talk to Team', href: '/contact', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-12'>
        <SectionHeading
          label='Core Modules'
          title='Built to optimize every delivery stage'
          description='Each module reduces operational friction while improving trust and transparency.'
        />
        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {featureCategories.map((category) => (
            <article key={category.title} className='glass-card space-y-5 p-6 md:p-7'>
              <div className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-subtle text-primary'>
                <category.icon className='h-5 w-5' />
              </div>
              <div>
                <h3 className='text-xl font-heading font-semibold text-foreground'>{category.title}</h3>
                <p className='mt-2 text-sm leading-relaxed text-muted'>{category.description}</p>
              </div>
              <ul className='space-y-2'>
                {category.bullets.map((bullet) => (
                  <li key={bullet} className='flex items-center gap-2 text-sm text-muted'>
                    <Sparkles className='h-3.5 w-3.5 text-primary' />
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pt-8 pb-12 md:pt-12'>
        <SectionHeading
          label='App Parity on Web'
          title='Same product journey across mobile and website'
          description='These feature surfaces bring app-level workflows directly into the web experience.'
        />
        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3'>
          {appFeatureParity.map((item) => (
            <article key={item.title} className='glass-card p-6 md:p-7'>
              <div className='flex items-start gap-4'>
                <div className='mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle text-accent'>
                  <item.icon className='h-5 w-5' />
                </div>
                <div>
                  <h3 className='text-lg font-heading font-semibold text-foreground'>{item.title}</h3>
                  <p className='mt-2 text-sm leading-relaxed text-muted'>{item.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pt-12 pb-24'>
        <SectionHeading
          label='Professional Workflows'
          title='Designed for teams that need consistency'
          description='Whether shipping personal parcels or managing business routes, the experience stays smooth.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-2'>
          {productHighlights.map((item) => (
            <article key={item.title} className='glass-card p-6 md:p-7'>
              <div className='flex items-start gap-4'>
                <div className='mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle text-accent'>
                  <item.icon className='h-5 w-5' />
                </div>
                <div>
                  <h3 className='text-lg font-heading font-semibold text-foreground'>{item.title}</h3>
                  <p className='mt-2 text-sm leading-relaxed text-muted'>{item.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}
