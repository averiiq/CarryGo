import { LegalPage } from '@/components/marketing/legal-page'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata(
  'Privacy Policy',
  'Read how CaryGoo collects, uses, stores, and protects your personal information under applicable Indian data protection laws.',
  '/privacy-policy'
)

const sections = [
  {
    id: 'introduction',
    title: 'Introduction and Platform Identification',
    content: [
      'This Privacy Policy ("Policy") is published by CaryGoo Technologies Private Limited ("CaryGoo", "we", "us", or "our"), a company incorporated under the Companies Act, 2013, having its registered office at Plot No. 44, Institutional Area, Sector 44, Gurugram, Haryana — 122003, India (CIN: U63090HR2026PTC109842).',
      'CaryGoo operates a peer-to-peer intercity parcel delivery marketplace accessible through mobile applications and the website at app.carygoo.in (collectively, the "Platform"). This Policy describes how we collect, use, store, share, and protect personal information when you access or use the Platform.',
      'By creating an account or using the Platform, you acknowledge that you have read and understood this Policy. If you do not agree with any part of this Policy, please do not use the Platform.',
    ],
  },
  {
    id: 'scope',
    title: 'Scope and Applicability',
    content: [
      'This Policy applies to all users of the Platform, including Senders (individuals who create parcel delivery requests), Travelers (individuals who accept and carry parcels), and visitors browsing the Platform without an account.',
      'This Policy covers personal information collected through the CaryGoo mobile applications (Android and iOS), the CaryGoo website, customer support interactions, and any other channels where CaryGoo collects information from you.',
      'Third-party services integrated into the Platform (including payment gateways, identity verification providers, and analytics tools) are governed by their own privacy policies. We encourage you to review those policies independently.',
    ],
  },
  {
    id: 'information-collected',
    title: 'Information We Collect',
    content: [
      'Account Information: When you register, we collect your full name, email address, and mobile number. You may optionally provide a profile photograph.',
      'Identity Verification Information: To verify Travelers, we may collect government-issued identity documents such as Aadhaar card details (name, masked number, photograph) and driving licence information, along with biometric facial liveness data processed for identity matching. This information is collected through authorised third-party KYC verification providers.',
      'Parcel and Delivery Information: We collect parcel descriptions, parcel photographs, declared contents, declared value, weight, pickup addresses, delivery addresses, preferred delivery dates, and special handling instructions provided by Senders.',
      'Trip and Route Information: We collect route details provided by Travelers, including origin city, destination city, travel date, travel time, vehicle type, and available carrying capacity.',
      'Payment Transaction References: We collect payment transaction identifiers, order references, payment status, and amounts associated with your bookings. Sensitive payment credentials such as UPI PINs, card numbers, CVVs, and banking passwords are handled directly by the authorised payment gateway and are not stored by CaryGoo.',
      'Communication Records: Messages exchanged between users through the Platform\'s in-app chat, as well as communications with our customer support team, are recorded.',
      'Device and Technical Information: We automatically collect device identifiers, device model, operating system version, app version, IP address, browser type, screen resolution, and session identifiers when you access the Platform.',
      'Location Information: With your permission, we may collect approximate location data to assist with route matching and delivery coordination. You can revoke location permissions through your device settings at any time.',
      'Usage and Analytics Data: We collect information about how you interact with the Platform, including pages visited, features used, search queries, timestamps, and session duration.',
      'Push Notification Tokens: If you enable push notifications, we store device tokens necessary to deliver notifications about booking updates, delivery status, and platform announcements.',
    ],
  },
  {
    id: 'how-collected',
    title: 'How We Collect Information',
    content: [
      'Directly from You: Information you provide during account registration, profile setup, parcel creation, trip posting, KYC verification, chat messages, and support requests.',
      'Automatically: Technical and usage data collected through server logs, cookies, and analytics software when you interact with the Platform.',
      'From Third-Party Services: Identity verification results from KYC providers, payment transaction confirmations from payment gateways, and push notification delivery receipts from notification services.',
    ],
  },
  {
    id: 'purpose-of-collection',
    title: 'Purpose of Collection and Use',
    content: [
      'We use the collected information for the following purposes:',
      'To create, maintain, and secure your account on the Platform.',
      'To match Senders with Travelers based on route, timing, and capacity availability.',
      'To facilitate communication between Senders and Travelers for delivery coordination.',
      'To process payment transactions through the integrated payment gateway and track payment and settlement status.',
      'To verify Traveler identity through KYC processes and maintain platform trust and safety.',
      'To send transactional notifications about booking confirmations, delivery updates, payment status, and OTP verification codes.',
      'To investigate, prevent, and respond to fraud, policy violations, suspicious activities, and security incidents.',
      'To resolve disputes between users and process support requests.',
      'To generate aggregated, anonymised analytics to improve Platform features, reliability, and user experience.',
      'To comply with applicable legal obligations, regulatory requirements, and lawful requests from government authorities.',
    ],
  },
  {
    id: 'sharing-between-users',
    title: 'Information Shared Between Sender and Traveler',
    content: [
      'When a delivery request is accepted, limited information is shared between the Sender and the matched Traveler to facilitate the delivery. This typically includes the user\'s display name, parcel details, pickup and delivery locations, and delivery timeline.',
      'Contact details such as phone numbers may be shared only when necessary for delivery coordination and only after a booking is confirmed.',
      'User profile photographs and ratings may be visible to other users on the Platform to build trust and transparency.',
    ],
  },
  {
    id: 'payment-data-sharing',
    title: 'Payment Gateway and Payment Processor Data Sharing',
    content: [
      'Payment transactions on the Platform are processed through authorised third-party payment gateways. When you make a payment, your payment details are transmitted directly to the payment gateway\'s secure infrastructure.',
      'CaryGoo receives only transaction references, payment status confirmations, and amounts from the payment gateway. We do not receive, process, or store your full card numbers, UPI PINs, net banking credentials, or other sensitive payment authentication data.',
      'The payment gateway\'s handling of your payment information is governed by its own privacy policy and applicable regulatory requirements, including PCI-DSS compliance standards where applicable.',
    ],
  },
  {
    id: 'third-party-providers',
    title: 'Third-Party Service Providers',
    content: [
      'We engage trusted third-party service providers to support Platform operations. These providers process personal information only as necessary to perform their designated functions and are contractually obligated to protect your data. Categories of service providers include:',
      'Cloud Infrastructure and Hosting: For secure data storage and Platform hosting.',
      'Identity Verification (KYC): For Aadhaar and driving licence verification and biometric liveness checks.',
      'Payment Processing: For processing payments, refunds, and settlements.',
      'Push Notification Services: For delivering real-time notifications to your device.',
      'Email Communication: For sending transactional emails such as OTP codes, booking confirmations, and support correspondence.',
      'Analytics: For understanding Platform usage patterns and improving features.',
      'We do not sell, rent, or trade your personal information to third parties for their independent marketing or advertising purposes.',
    ],
  },
  {
    id: 'data-storage-security',
    title: 'Data Storage and Security Measures',
    content: [
      'Your personal information is stored on secure cloud infrastructure with data centres that implement industry-standard physical and logical security controls.',
      'We implement technical safeguards including encryption of data in transit (TLS/SSL), row-level security policies on database access, role-based access controls for internal personnel, and regular security audits of Platform infrastructure.',
      'Sensitive identity verification data such as Aadhaar numbers is stored in masked or encrypted form. Full document images are retained only as long as necessary for the verification process.',
      'While we take reasonable measures to protect your information, no method of electronic storage or transmission is completely secure. We cannot guarantee absolute security, and you use the Platform at your own risk in this regard.',
    ],
  },
  {
    id: 'data-retention',
    title: 'Data Retention and Deletion',
    content: [
      'We retain your personal information for as long as your account remains active and for a reasonable period thereafter as necessary to fulfil the purposes described in this Policy, comply with legal obligations, resolve disputes, and enforce our agreements.',
      'Transaction records, payment references, and delivery logs may be retained for up to seven (7) years from the date of the transaction to comply with applicable accounting, tax, and regulatory requirements.',
      'Communication records and support tickets are retained for up to three (3) years from the date of the last interaction.',
      'Upon account deletion (see Section 13), we will delete or anonymise your personal information within a reasonable timeframe, except where retention is required by law or for legitimate business purposes such as fraud prevention.',
    ],
  },
  {
    id: 'user-rights',
    title: 'User Rights and Consent',
    content: [
      'Subject to applicable Indian data protection laws, including the Digital Personal Data Protection Act, 2023 (and rules notified thereunder), you have the following rights:',
      'Right to Access: You may request a summary of the personal data we hold about you.',
      'Right to Correction: You may request correction of inaccurate or incomplete personal data.',
      'Right to Erasure: You may request deletion of your personal data, subject to legal retention requirements.',
      'Right to Withdraw Consent: Where processing is based on your consent, you may withdraw consent at any time. Withdrawal of consent does not affect the lawfulness of processing carried out prior to withdrawal.',
      'Right to Grievance Redressal: You may raise concerns about our data processing practices through the grievance mechanism described in Section 18.',
      'Right to Nominate: You may nominate another individual to exercise your data protection rights in the event of your death or incapacity, as provided under applicable law.',
      'To exercise any of these rights, please contact us at support@carygoo.in or grievance@carygoo.in with your registered email address and a description of your request.',
    ],
  },
  {
    id: 'account-deletion',
    title: 'Account Deletion Procedure',
    content: [
      'You may request deletion of your CaryGoo account at any time through the "Delete Account" option in your Profile settings within the app or website, or by emailing support@carygoo.in from your registered email address.',
      'Upon receiving a valid deletion request, we will process the deletion within thirty (30) days. During this period, your account will be deactivated and you will not be able to access Platform services.',
      'Account deletion will result in permanent removal of your profile information, active listings, and chat history. Transaction records, payment references, and delivery logs may be retained as described in Section 10 to comply with legal requirements.',
      'Any pending deliveries, unresolved disputes, or outstanding payments must be completed or settled before account deletion can be processed.',
    ],
  },
  {
    id: 'cookies-analytics',
    title: 'Cookies and Analytics',
    content: [
      'The CaryGoo website uses essential cookies necessary for Platform functionality, such as session management and authentication state. These cookies are required for the Platform to operate correctly.',
      'We may use analytics tools to collect anonymised usage data, including page views, feature interactions, and session durations. This data is used in aggregate form to improve Platform performance and user experience.',
      'We do not use third-party advertising cookies or tracking pixels for behavioural advertising purposes.',
      'You can manage cookie preferences through your browser settings. Disabling essential cookies may affect your ability to use certain Platform features.',
    ],
  },
  {
    id: 'location-permissions',
    title: 'Location Permissions',
    content: [
      'The Platform may request access to your device\'s location services to assist with route matching, delivery coordination, and providing location-based search results.',
      'Location access is optional. You can deny or revoke location permissions at any time through your device\'s operating system settings without affecting your ability to use core Platform features.',
      'When location permission is granted, we collect approximate location data. We do not continuously track your real-time location in the background.',
    ],
  },
  {
    id: 'childrens-privacy',
    title: 'Children\'s Privacy',
    content: [
      'The Platform is intended for use by individuals who are at least eighteen (18) years of age. We do not knowingly collect personal information from individuals under the age of 18.',
      'If we become aware that we have collected personal information from a person under 18, we will take reasonable steps to delete such information promptly.',
      'If you are a parent or guardian and believe that a minor has provided personal information to CaryGoo, please contact us at support@carygoo.in so we can take appropriate action.',
    ],
  },
  {
    id: 'data-breach',
    title: 'Data Breach and Security Incident Handling',
    content: [
      'In the event of a personal data breach that is likely to cause significant harm to affected individuals, CaryGoo will notify the relevant regulatory authority (the Data Protection Board of India, once constituted, or other applicable authority) and affected users without unreasonable delay, in accordance with the requirements of the Digital Personal Data Protection Act, 2023 and applicable rules.',
      'Our notification will include the nature of the breach, the categories of data affected, the likely consequences, and the measures taken or proposed to address the breach.',
      'We maintain an internal incident response procedure to detect, investigate, contain, and remediate security incidents promptly.',
    ],
  },
  {
    id: 'grievance-redressal',
    title: 'Grievance Redressal Mechanism',
    content: [
      'If you have any concerns, complaints, or grievances regarding the processing of your personal information or this Privacy Policy, you may contact our Grievance Officer:',
      'Name: Jatin. Designation: Grievance Officer, CaryGoo Technologies Private Limited. Email: grievance@carygoo.in. Phone: +91 99924 64637. Address: Plot No. 44, Institutional Area, Sector 44, Gurugram, Haryana — 122003, India.',
      'Grievances will be acknowledged within twenty-four (24) hours of receipt and addressed within fifteen (15) days, in accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the Consumer Protection (E-Commerce) Rules, 2020.',
      'If you are not satisfied with the resolution, you may escalate your complaint to the relevant regulatory authority or consumer forum under applicable law.',
    ],
  },
  {
    id: 'policy-changes',
    title: 'Changes to This Policy',
    content: [
      'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or Platform features.',
      'Material changes will be communicated through in-app notifications, email to your registered email address, or a prominent notice on the Platform prior to the changes taking effect.',
      'Your continued use of the Platform after the effective date of a revised Policy constitutes your acceptance of the updated terms. If you do not agree with the changes, you should discontinue use and request account deletion.',
      'We recommend reviewing this Policy periodically to stay informed about how we protect your information.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Information',
    content: [
      'For questions, concerns, or requests related to this Privacy Policy or your personal information, you may contact us at:',
      'CaryGoo Technologies Private Limited. Email: support@carygoo.in. Grievance email: grievance@carygoo.in. Phone: +91 99924 64637. Registered address: Plot No. 44, Institutional Area, Sector 44, Gurugram, Haryana — 122003, India. CIN: U63090HR2026PTC109842.',
    ],
  },
]

const relatedLinks = [
  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
  { label: 'Cancellation & Refund', href: '/refund-cancellation' },
  { label: 'Shipping & Delivery', href: '/shipping-delivery' },
  { label: 'Prohibited Items', href: '/prohibited-items' },
  { label: 'Payment & Settlement', href: '/payment-settlement' },
  { label: 'Grievance Redressal', href: '/grievance-redressal' },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title='Privacy Policy'
      summary='This Privacy Policy explains how CaryGoo Technologies Private Limited collects, uses, stores, shares, and protects personal information when you use our peer-to-peer intercity parcel delivery platform.'
      effectiveDate='14 November 2026'
      lastUpdated='14 November 2026'
      sections={sections}
      relatedLinks={relatedLinks}
    />
  )
}
