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
          badge="Send a Parcel"
          title="Create a Parcel Request"
          description="Specify your route, item category, package weight, and preferred delivery date to match with verified travelers heading your way."
          illustrationSrc="/images/abstract/sender-logistics.jpg"
          illustrationAlt="Abstract 3D parcel logistics artwork"
          illustrationLabel="Protected delivery request"
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
