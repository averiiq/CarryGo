import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ParityCreateForm } from '@/components/marketing/parity-create-form'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata(
  'Create Trip',
  'Post a trip on CarryGo web with app-style workflow and validations.',
  '/create-trip'
)

export default function CreateTripPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 pt-16 pb-10 md:pt-24 md:pb-12'>
        <PageHero
          badge="Travel & Earn"
          title="Post Your Travel Plan"
          description="Share your upcoming road trip, train journey, or flight to monetize unused luggage space and offset travel expenses."
          illustrationSrc="/images/abstract/traveler-journey.jpg"
          illustrationAlt="Abstract 3D traveler mobility sculpture"
          illustrationLabel="Trip publishing workflow"
          actions={[
            { label: 'Create Parcel Instead', href: '/create-parcel' },
            { label: 'See How It Works', href: '/how-it-works', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-24 md:pb-28'>
        <ParityCreateForm mode='trip' />
      </ScrollLinkedSection>
    </MarketingShell>
  )
}
