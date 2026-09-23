import { AlertTriangle, ClipboardCheck, Fingerprint, ShieldCheck, Siren, UserRoundCheck } from 'lucide-react'
import { Reveal } from '@/components/marketing/animated-reveal'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { EscrowVaultIllustration } from '@/components/illustrations/escrow-vault-illustration'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata('Safety', 'Review CarryGo identity, handover, payment, and support safeguards.', '/safety')

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
    title: 'Smart Escrow Vault',
    description: 'Fares remain locked in platform escrow until the recipient confirms physical delivery.',
    icon: ShieldCheck,
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
      <ScrollLinkedSection className='px-4 sm:px-6 py-16 md:py-24'>
        <PageHero
          badge='Safety and Trust'
          title='Protection Layers Built into Every Delivery'
          description='CarryGo unites verified identity screening, Golden Handshake passkeys, and SafeVault™ protection to make every peer-to-peer delivery completely tranquil and secure.'
          illustrationSrc="/images/abstract/escrow-security.jpg"
          illustrationAlt="Minimalist 3D frosted glass and platinum security shield lock"
          illustrationLabel="SafeVault™ Golden Handshake Protection"
          actions={[
            { label: 'View Legal Policies', href: '/terms-and-conditions' },
            { label: 'Contact Support', href: '/contact', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-4 sm:px-6 pb-12'>
        <div className='mx-auto max-w-6xl mb-12'>
          <EscrowVaultIllustration />
        </div>

        <SectionHeading
          label='Signature Assurance'
          title='Designed for prevention, not just response'
          description='Risk controls are embedded from onboarding through final payout closure.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 sm:grid-cols-2 md:grid-cols-3 [&>*:last-child]:col-span-1 sm:[&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1'>
          {safetyLayers.map((layer, index) => (
            <Reveal key={layer.title} delay={index * 0.06}>
              <article className='sturdy-card p-6 md:p-7 h-full flex flex-col justify-between'>
                <div>
                  <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200'>
                    <layer.icon className='h-5 w-5' />
                  </div>
                  <h3 className='mt-4 text-lg font-heading font-bold text-slate-900'>{layer.title}</h3>
                  <p className='mt-2 text-sm leading-relaxed text-slate-600 font-normal'>{layer.description}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-4 sm:px-6 pt-12 pb-24'>
        <SectionHeading
          label='Concierge Resolution'
          title='Swift and transparent resolution path'
          description='When questions arise, our Resolution Concierge provides verified journey records for prompt care.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 sm:grid-cols-2 md:grid-cols-3 [&>*:last-child]:col-span-1 sm:[&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1'>
          {incidentFlow.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.06}>
              <article className='sturdy-card p-6 md:p-7 h-full flex flex-col justify-between'>
                <div>
                  <div className='mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-500/25 bg-sky-50 text-xs font-semibold text-sky-800 font-mono'>
                    {index + 1}
                  </div>
                  <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 border border-sky-200 mb-3'>
                    <step.icon className='h-5 w-5' />
                  </div>
                  <h3 className='mt-1 text-lg font-heading font-bold text-slate-900'>{step.title}</h3>
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







