import { LegalPage } from '@/components/marketing/legal-page'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata(
  'Account & Data Deletion',
  'Learn how to permanently delete your CarryGo account and personal data.',
  '/delete-account'
)

const sections = [
  {
    title: 'How to Delete Your Account In-App',
    paragraphs: [
      'You can permanently delete your CarryGo account at any time directly from within the mobile app.',
      'To delete your account in the app: Open CarryGo > Tap the Profile tab at the bottom > Scroll down to the Account section > Tap "Delete Account" > Confirm your deletion.',
      'Once confirmed, your authentication session will end immediately, and your profile, active listings, and personal credentials will be permanently erased.',
    ],
  },
  {
    title: 'How to Request Deletion via Web / Email',
    paragraphs: [
      'If you cannot access the mobile application, you can submit an account and data deletion request by emailing us at support@carrygo.in with the subject line "Account Deletion Request".',
      'Please include the registered email address or phone number associated with your CarryGo account. Our security team will verify your identity and process the deletion within 48 to 72 hours.',
    ],
  },
  {
    title: 'Types of Data Deleted',
    paragraphs: [
      'Upon account deletion, the following data is permanently removed: Full name, phone number, email address, profile picture, KYC submission records, saved routes, listed trips, posted parcels, in-app chat history, and push notification tokens.',
    ],
  },
  {
    title: 'Data Retention for Legal & Regulatory Compliance',
    paragraphs: [
      'In accordance with applicable Indian laws (including the Information Technology Act, 2000, and the Digital Personal Data Protection Act, 2023), certain financial transaction identifiers and dispute resolution logs may be retained for the minimum statutory period required for tax, accounting, and anti-fraud purposes.',
      'Any retained records are strictly isolated, encrypted, and never used for marketing or commercial operations.',
    ],
  },
]

export default function DeleteAccountPage() {
  return (
    <LegalPage
      title="Account & Data Deletion"
      summary="CarryGo respects your right to privacy and provides full control over your personal account and data."
      lastUpdated="September 14, 2026"
      sections={sections}
      relatedLinks={[
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Terms & Conditions', href: '/terms-and-conditions' },
        { label: 'Contact Support', href: '/contact' },
      ]}
    />
  )
}
