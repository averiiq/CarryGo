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
          badge='App Feature Parity'
          title='Create Trip on Website'
          description='This web flow mirrors the mobile Create Trip journey with route, schedule, capacity, and pricing fields.'
          illustrationSrc='/images/custom/route-network.svg'
          illustrationAlt='Route network illustration'
          illustrationLabel='Trip publishing workflow'
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
