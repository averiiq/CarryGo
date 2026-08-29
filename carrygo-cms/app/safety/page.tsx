import { AlertTriangle, ClipboardCheck, Fingerprint, ShieldCheck, Siren, UserRoundCheck } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'

const safetyLayers = [
  {
    title: 'Identity Verification',
    description: 'Every active account goes through KYC checks before parcel exchange.',
    icon: UserRoundCheck,
  },
  {
    title: 'OTP Handover Protocol',
    description: 'Pickup and drop checkpoints are protected with one-time codes.',
    icon: Fingerprint,
  },
  {
    title: 'Automated Risk Signals',
    description: 'Behavioral anomalies trigger alerts for operations review.',
    icon: Siren,
  },
]

const incidentFlow = [
  {
    title: 'Report issue instantly',
    description: 'Users can raise route or handover concerns with context in-app.',
    icon: AlertTriangle,
  },
  {
    title: 'Policy-backed review',
    description: 'Support evaluates logs, timestamps, and communication trails.',
    icon: ClipboardCheck,
  },
  {
    title: 'Resolution and prevention',
    description: 'Outcomes may include refunds, restrictions, or account controls.',
    icon: ShieldCheck,
  },
]

export default function SafetyPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 py-16 md:py-20'>
        <PageHero
          badge='Safety and Trust'
          title='Protection Layers Built into Every Delivery'
          description='CarryGo combines identity checks, secure handovers, and incident-ready workflows to keep delivery dependable.'
          illustrationSrc='/images/handover.jpg'
          illustrationAlt='Secure parcel handover'
          illustrationLabel='Policy-first protection layers'
          actions={[
            { label: 'View Legal Policies', href: '/terms-and-conditions' },
            { label: 'Contact Support', href: '/contact', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-9'>
        <SectionHeading
          label='Safety Architecture'
          title='Designed for prevention, not just response'
          description='Risk controls are embedded from onboarding through final payout closure.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {safetyLayers.map((layer) => (
            <article key={layer.title} className='glass-card p-7'>
              <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle text-primary'>
                <layer.icon className='h-5 w-5' />
              </div>
              <h3 className='mt-4 text-lg font-heading font-semibold text-foreground'>{layer.title}</h3>
              <p className='mt-2 text-sm leading-relaxed text-muted'>{layer.description}</p>
            </article>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-20 pt-14'>
        <SectionHeading
          label='Incident Handling'
          title='Fast and auditable escalation path'
          description='When issues happen, the platform provides enough evidence for quick resolution.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {incidentFlow.map((step, index) => (
            <article key={step.title} className='glass-card p-7'>
              <div className='mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white'>
                {index + 1}
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



