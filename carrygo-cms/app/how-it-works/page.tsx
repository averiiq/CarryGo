import { CheckCheck, ClipboardList, Handshake, MessageSquare, Route, ShieldCheck } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'

const senderFlow = [
  {
    title: 'Post Request',
    description: 'Describe parcel size, value, route, and preferred delivery window.',
    icon: ClipboardList,
  },
  {
    title: 'Choose Trusted Match',
    description: 'Review verified travelers and select the best fit for your timeline.',
    icon: Route,
  },
  {
    title: 'Secure Pickup',
    description: 'Complete handover using OTP and validated parcel details.',
    icon: Handshake,
  },
]

const deliveryFlow = [
  {
    title: 'In-transit Visibility',
    description: 'Receive status updates across major delivery checkpoints.',
    icon: MessageSquare,
  },
  {
    title: 'OTP Drop Confirmation',
    description: 'Recipient verifies final handover through protected confirmation flow.',
    icon: CheckCheck,
  },
  {
    title: 'Policy-backed Closure',
    description: 'Payments and logs are finalized with support-ready audit history.',
    icon: ShieldCheck,
  },
]

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <PageHero
          badge='Workflow'
          title='A Clear Delivery Journey for Everyone Involved'
          description='CarryGo removes ambiguity with structured pickup, transit, and delivery operations designed around trust and speed.'
          illustrationSrc='/images/custom/secure-handover.svg'
          illustrationAlt='Custom secure handover illustration'
          illustrationLabel='Structured delivery journey'
          actions={[
            { label: 'View Sender Experience', href: '/for-senders' },
            { label: 'View Traveler Experience', href: '/for-travelers', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-12'>
        <SectionHeading
          label='Phase One'
          title='Request to pickup'
          description='Simple onboarding for senders while preserving matching quality and safety.'
        />
        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {senderFlow.map((step, index) => (
            <article key={step.title} className='glass-card p-6 md:p-7'>
              <div className='mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 bg-primary-subtle text-xs font-semibold text-primary'>
                {index + 1}
              </div>
              <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle text-primary'>
                <step.icon className='h-5 w-5' />
              </div>
              <h3 className='mt-4 text-lg font-heading font-semibold text-foreground'>{step.title}</h3>
              <p className='mt-2 text-sm leading-relaxed text-muted'>{step.description}</p>
            </article>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pt-12 pb-24'>
        <SectionHeading
          label='Phase Two'
          title='Transit to closure'
          description='Delivery progress remains visible and policy-supported through completion.'
        />
        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {deliveryFlow.map((step, index) => (
            <article key={step.title} className='glass-card p-6 md:p-7'>
              <div className='mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-accent/25 bg-accent-subtle text-xs font-semibold text-accent'>
                {index + 4}
              </div>
              <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle text-accent'>
                <step.icon className='h-5 w-5' />
              </div>
              <h3 className='mt-4 text-lg font-heading font-semibold text-foreground'>{step.title}</h3>
              <p className='mt-2 text-sm leading-relaxed text-muted'>{step.description}</p>
            </article>
          ))}
        </div>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}







