import { LegalPage } from '@/components/marketing/legal-page'

import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata('Shipping and Delivery Policy', 'Review CarryGo delivery scope, timelines, and handover responsibilities.', '/shipping-delivery')

const sections = [
  {
    title: 'Service Scope',
    paragraphs: [
      'CarryGo coordinates peer-to-peer parcel movement through verified travelers and route matching.',
      'Transport timelines vary by route availability, weather, travel constraints, and compliance checks.',
    ],
  },
  {
    title: 'Delivery Timelines',
    paragraphs: [
      'Estimated delivery windows shown in the platform are indicative and not guaranteed unless explicitly committed in writing.',
      'Users are responsible for providing accurate pickup and drop details to avoid delays.',
    ],
  },
  {
    title: 'Packaging and Restricted Items',
    paragraphs: [
      'Senders must package parcels safely and truthfully declare parcel contents, value, and handling requirements.',
      'Illegal, hazardous, or policy-restricted items are prohibited and may lead to cancellation and account suspension.',
    ],
  },
  {
    title: 'Failed or Delayed Delivery',
    paragraphs: [
      'If delivery is delayed or fails, CarryGo support guides next steps based on tracking history and policy rules.',
      'Compensation, refunds, or disputes are handled according to the Refund & Cancellation Policy.',
    ],
  },
]

export default function ShippingDeliveryPage() {
  return (
    <LegalPage
      title='Shipping & Delivery Policy'
      summary='This policy explains service scope, delivery expectations, and responsibilities for shipment handling on CarryGo.'
      lastUpdated='August 27, 2026'
      sections={sections}
      relatedLinks={[
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Terms & Conditions', href: '/terms-and-conditions' },
        { label: 'Refund & Cancellation', href: '/refund-cancellation' },
      ]}
    />
  )
}


