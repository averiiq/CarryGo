import { LegalPage } from '@/components/marketing/legal-page'

const sections = [
  {
    title: 'Acceptance of Terms',
    paragraphs: [
      'By using CarryGo websites, apps, and related services, you agree to these Terms and all applicable platform policies.',
      'If you do not agree, you must stop using the service.',
    ],
  },
  {
    title: 'Accounts and Eligibility',
    paragraphs: [
      'You must provide accurate account information and keep credentials secure.',
      'CarryGo may suspend or restrict accounts involved in fraud, abuse, or policy violations.',
    ],
  },
  {
    title: 'Platform Role and Transactions',
    paragraphs: [
      'CarryGo enables sender and traveler coordination, communication, and payment workflows.',
      'Pricing, delivery timing, and acceptance are subject to route availability, verification checks, and platform rules.',
    ],
  },
  {
    title: 'Prohibited Use',
    paragraphs: [
      'Users must not post illegal, unsafe, restricted, or misdeclared parcels, or bypass verification and security checks.',
      'Abuse of payment flows, identity systems, messaging, or dispute tools may lead to permanent removal and legal action.',
    ],
  },
  {
    title: 'Liability and Governing Law',
    paragraphs: [
      'CarryGo is provided on an as-is and as-available basis to the maximum extent permitted by law.',
      'These Terms are governed by applicable laws of India, and disputes are handled by competent courts where CarryGo is registered.',
    ],
  },
]

export default function TermsAndConditionsPage() {
  return (
    <LegalPage
      title='Terms & Conditions'
      summary='These terms define acceptable use, account responsibilities, and legal boundaries for using the CarryGo platform.'
      lastUpdated='August 27, 2026'
      sections={sections}
      relatedLinks={[
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Refund & Cancellation', href: '/refund-cancellation' },
        { label: 'Shipping & Delivery', href: '/shipping-delivery' },
      ]}
    />
  )
}
