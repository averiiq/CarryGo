import { Clock3, FileCheck2, PackageCheck, ShieldCheck, TrendingUp } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'

const senderBenefits = [
  {
    title: 'Faster Delivery Windows',
    description: 'Match with active travelers already heading to your destination.',
    icon: Clock3,
  },
  {
    title: 'Trackable Operations',
    description: 'Get structured updates from booking through successful drop.',
    icon: PackageCheck,
  },
  {
    title: 'Secure Handover Controls',
    description: 'Use OTP checkpoints and verified users to reduce uncertainty.',
    icon: ShieldCheck,
  },
]

const senderUseCases = [
  'Urgent same-day document movement',
  'Intercity inventory replenishment',
  'SMB and D2C support logistics',
  'High-priority spare parts dispatch',
]

export default function ForSendersPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <PageHero
          badge='For Senders'
          title='Ship Better with Speed, Visibility, and Trust'
          description='CarryGo gives senders a premium logistics experience without the complexity of running fleet operations.'
          illustrationSrc='/images/custom/sender-operations.svg'
          illustrationAlt='Business shipping operations'
          illustrationLabel='Transparent sender pricing'
          actions={[
            { label: 'Contact Sales', href: '/contact' },
            { label: 'View Pricing', href: '/pricing', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-12'>
        <SectionHeading
          label='Why Senders Choose CarryGo'
          title='Operational confidence at every shipment'
          description='From individual parcels to recurring business routes, workflows stay predictable and transparent.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {senderBenefits.map((benefit) => (
            <article key={benefit.title} className='glass-card p-6 md:p-7'>
              <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle text-primary'>
                <benefit.icon className='h-5 w-5' />
              </div>
              <h3 className='mt-4 text-lg font-heading font-semibold text-foreground'>{benefit.title}</h3>
              <p className='mt-2 text-sm leading-relaxed text-muted'>{benefit.description}</p>
            </article>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pt-12 pb-24'>
        <div className='mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-2'>
          <article className='glass-card p-6 md:p-8'>
            <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-success-subtle text-success'>
              <FileCheck2 className='h-5 w-5' />
            </div>
            <h3 className='mt-4 text-2xl font-heading font-semibold text-foreground'>Built for practical use cases</h3>
            <ul className='mt-5 space-y-3 text-sm text-muted'>
              {senderUseCases.map((item) => (
                <li key={item} className='flex items-start gap-2'>
                  <TrendingUp className='mt-0.5 h-4 w-4 text-primary' />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className='glass-card p-6 md:p-8'>
            <h3 className='text-2xl font-heading font-semibold text-foreground'>End-to-end sender flow</h3>
            <ol className='mt-5 space-y-3 text-sm text-muted'>
              <li>1. Create delivery request with route and parcel details.</li>
              <li>2. Pick verified traveler based on confidence indicators.</li>
              <li>3. Complete OTP-secured pickup and monitor transit.</li>
              <li>4. Confirm drop and close payment flow with logs.</li>
            </ol>
          </article>
        </div>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}







