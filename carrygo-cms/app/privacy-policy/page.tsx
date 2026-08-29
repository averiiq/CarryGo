import { LegalPage } from '@/components/marketing/legal-page'

const sections = [
  {
    title: 'Information We Collect',
    paragraphs: [
      'We collect account details, parcel details, payment details, device identifiers, and support messages needed to run CarryGo services.',
      'We also collect usage and security logs to prevent fraud, enforce platform safety, and improve reliability.',
    ],
  },
  {
    title: 'How We Use Information',
    paragraphs: [
      'We use your information to manage accounts, match senders with travelers, process payments, resolve disputes, and provide support.',
      'Aggregated analytics may be used to improve product quality, pricing controls, and trust and safety operations.',
    ],
  },
  {
    title: 'Sharing and Disclosure',
    paragraphs: [
      'We only share information required to complete deliveries, process payments, comply with law, prevent abuse, or operate trusted service providers.',
      'We do not sell personal information to third parties for unrelated advertising.',
    ],
  },
  {
    title: 'Data Retention and Rights',
    paragraphs: [
      'We retain information only as long as needed for legal, security, and operational purposes.',
      'You can request access, correction, or deletion of personal data by emailing support@carrygo.in.',
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title='Privacy Policy'
      summary='This policy explains how CarryGo collects, uses, and protects data while operating our peer-to-peer delivery platform.'
      lastUpdated='August 27, 2026'
      sections={sections}
      relatedLinks={[
        { label: 'Terms & Conditions', href: '/terms-and-conditions' },
        { label: 'Refund & Cancellation', href: '/refund-cancellation' },
        { label: 'Shipping & Delivery', href: '/shipping-delivery' },
      ]}
    />
  )
}


