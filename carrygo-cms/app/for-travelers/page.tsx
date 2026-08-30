import { BadgeCheck, Coins, Compass, ShieldCheck, UserCheck } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata('For Travelers', 'Learn how travelers can carry suitable parcels on journeys they already make.', '/for-travelers')

const travelerBenefits = [
  {
    title: 'Earn on Existing Routes',
    description: 'Monetize travel you already do with predictable parcel assignments.',
    icon: Coins,
  },
  {
    title: 'Clear Route Commitments',
    description: 'Accept only deliveries that fit your schedule and travel comfort.',
    icon: Compass,
  },
  {
    title: 'Verified Community',
    description: 'Operate inside a trust-driven network with identity checks and ratings.',
    icon: UserCheck,
  },
]

const eligibility = [
  'Government-approved ID and KYC verification',
  'Consistent route behavior and communication quality',
  'Compliance with prohibited-item and handover policies',
  'Successful completion history for better matching priority',
]

export default function ForTravelersPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <PageHero
          badge='For Travelers'
          title='Turn Your Routes into Trusted Earning Opportunities'
          description='CarryGo helps verified travelers earn extra while maintaining strong safety controls and transparent expectations.'
          illustrationSrc='/images/custom/traveler-earnings.svg'
          illustrationAlt='Custom traveler earnings illustration'
          illustrationLabel='Earn better on existing routes'
          actions={[
            { label: 'Talk to Team', href: '/contact' },
            { label: 'Read Safety Standards', href: '/safety', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-12'>
        <SectionHeading
          label='Traveler Value'
          title='A structured experience, not random parcel gigs'
          description='CarryGo protects traveler trust through policy-first assignments and transparent handovers.'
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {travelerBenefits.map((benefit) => (
            <article key={benefit.title} className='glass-card p-6 md:p-7'>
              <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle text-accent'>
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
              <BadgeCheck className='h-5 w-5' />
            </div>
            <h3 className='mt-4 text-2xl font-heading font-semibold text-foreground'>Eligibility and reliability standards</h3>
            <ul className='mt-5 space-y-3 text-sm text-muted'>
              {eligibility.map((item) => (
                <li key={item} className='flex items-start gap-2'>
                  <ShieldCheck className='mt-0.5 h-4 w-4 text-primary' />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className='glass-card p-6 md:p-8'>
            <h3 className='text-2xl font-heading font-semibold text-foreground'>How earnings flow</h3>
            <ol className='mt-5 space-y-3 text-sm text-muted'>
              <li>1. Accept route-compatible parcel assignment.</li>
              <li>2. Complete policy-compliant pickup and transit updates.</li>
              <li>3. Finish OTP-confirmed delivery handover.</li>
              <li>4. Receive payout after successful closure checks.</li>
            </ol>
          </article>
        </div>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}







