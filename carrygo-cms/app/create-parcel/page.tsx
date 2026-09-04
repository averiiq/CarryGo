import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ParityCreateForm } from '@/components/marketing/parity-create-form'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata(
  'Create Parcel',
  'Create parcel requests on CarryGo web with app-style workflow and validations.',
  '/create-parcel'
)

export default function CreateParcelPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 pt-16 pb-10 md:pt-24 md:pb-12'>
        <PageHero
          badge='App Feature Parity'
          title='Create Parcel on Website'
          description='This web flow mirrors the mobile Create Parcel journey with route, category, weight, and offer fields.'
          illustrationSrc='/images/custom/secure-handover.svg'
          illustrationAlt='Secure handover illustration'
          illustrationLabel='Parcel request workflow'
          actions={[
            { label: 'Create Trip Instead', href: '/create-trip' },
            { label: 'See Pricing', href: '/pricing', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-24 md:pb-28'>
        <ParityCreateForm mode='parcel' />
      </ScrollLinkedSection>
    </MarketingShell>
  )
}
