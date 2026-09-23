import { Compass, Gem, Target, Users } from 'lucide-react'
import { Reveal } from '@/components/marketing/animated-reveal'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata('About', 'Learn how CarryGo makes intercity parcel delivery more direct and dependable.', '/about')

const values = [
  {
    title: 'Trust by Design',
    description: 'Safety controls are baked into the product, not added later as optional layers.',
    icon: Gem,
  },
  {
    title: 'Operational Clarity',
    description: 'Each route, handover, and payout action is designed to be transparent and auditable.',
    icon: Target,
  },
  {
    title: 'Human-first Logistics',
    description: 'We balance speed and scale with respectful experiences for senders and travelers.',
    icon: Users,
  },
]

const milestones = [
  'Launched verified traveler network and route intelligence stack',
  'Expanded operations across high-demand city corridors',
  'Introduced policy-backed dispute and support workflows',
  'Built unified admin control center for operations visibility',
]

export default function AboutPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <PageHero
          badge='About CarryGo'
          title='Building the Most Trusted Peer Logistics Experience'
          description='CarryGo is focused on making parcel movement faster, safer, and more transparent through verified traveler networks.'
          illustrationSrc="/images/abstract/hero-routes.jpg"
          illustrationAlt="Abstract 3D interconnected network artwork"
          illustrationLabel="Human-first logistics platform"
          actions={[
            { label: 'Contact Us', href: '/contact' },
            { label: 'Explore Features', href: '/features', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-12'>
        <SectionHeading
          label='Our Principles'
          title='What guides product and operations'
          description='We combine design quality with operational discipline to build confidence at scale.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {values.map((value, index) => (
            <Reveal key={value.title} delay={index * 0.08}>
              <article className='sturdy-card p-6 md:p-7 h-full flex flex-col justify-between'>
                <div>
                  <div className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200'>
                    <value.icon className='h-5 w-5' />
                  </div>
                  <h3 className='mt-4 text-lg font-heading font-bold text-slate-900'>{value.title}</h3>
                  <p className='mt-2 text-sm leading-relaxed text-slate-600 font-normal'>{value.description}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pt-12 pb-24'>
        <div className='mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-2'>
          <Reveal delay={0.05}>
            <article className='sturdy-card p-6 md:p-8 h-full flex flex-col justify-between'>
              <div>
                <div className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 border border-sky-200'>
                  <Compass className='h-5 w-5' />
                </div>
                <h3 className='mt-4 text-2xl font-heading font-bold text-slate-900'>Our mission</h3>
                <p className='mt-3 text-sm leading-relaxed text-slate-600 font-normal'>
                  Build a dependable delivery layer where people and businesses can move parcels confidently using verified, route-aligned travelers.
                </p>
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.1}>
            <article className='sturdy-card p-6 md:p-8 h-full flex flex-col justify-between'>
              <div>
                <h3 className='text-2xl font-heading font-bold text-slate-900'>Milestones</h3>
                <ul className='mt-5 space-y-3 text-sm text-slate-600 font-normal'>
                  {milestones.map((item) => (
                    <li key={item} className='flex items-start gap-2.5'>
                      <span className='mt-1.5 h-2 w-2 rounded-full bg-emerald-600 shrink-0' />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </Reveal>
        </div>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}







