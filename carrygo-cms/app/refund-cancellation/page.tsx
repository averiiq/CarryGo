import { LegalPage } from '@/components/marketing/legal-page'

const sections = [
  {
    title: 'Cancellation Before Pickup',
    paragraphs: [
      'If a sender cancels before parcel pickup is confirmed, CarryGo applies a full refund to the original payment method.',
      'Processing time depends on payment gateway and bank timelines.',
    ],
  },
  {
    title: 'After Pickup and Disputes',
    paragraphs: [
      'After pickup, refunds are handled through dispute review based on delivery evidence, communication logs, and policy compliance.',
      'CarryGo may issue full, partial, or no refund depending on case outcome.',
    ],
  },
  {
    title: 'After Delivery Confirmation',
    paragraphs: [
      'Once delivery confirmation and payment release are complete, refunds are not automatic and require support escalation.',
      'Fraud or policy abuse can result in account action in addition to refund denial.',
    ],
  },
  {
    title: 'How to Request Support',
    paragraphs: [
      'For cancellation and refund support, contact support@carrygo.in with booking reference and issue details.',
      'We aim to acknowledge refund-related requests within two business days.',
    ],
  },
]

export default function RefundCancellationPage() {
  return (
    <LegalPage
      title='Refund & Cancellation Policy'
      summary='This policy outlines how cancellations, refund eligibility, and dispute resolution are handled on CarryGo.'
      lastUpdated='August 27, 2026'
      sections={sections}
      relatedLinks={[
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Terms & Conditions', href: '/terms-and-conditions' },
        { label: 'Shipping & Delivery', href: '/shipping-delivery' },
      ]}
    />
  )
}
