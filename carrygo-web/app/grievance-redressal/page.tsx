import { LegalPage } from '@/components/marketing/legal-page'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata(
  'Grievance Redressal Policy',
  'Learn how to submit complaints and grievances to CaryGoo, including the complaint process, timelines, and escalation procedures.',
  '/grievance-redressal'
)

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content: [
      'CaryGoo Technologies Private Limited ("CaryGoo", "we", "us") is committed to providing a fair, transparent, and responsive grievance redressal mechanism for all users of its peer-to-peer intercity parcel delivery platform.',
      'This Grievance Redressal Policy ("Policy") is published in accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the Consumer Protection (E-Commerce) Rules, 2020, and other applicable Indian laws.',
      'This Policy describes how users can submit complaints and grievances, the acknowledgement and resolution process, applicable timelines, and the escalation procedure.',
    ],
  },
  {
    id: 'platform-identification',
    title: 'Platform and Business Identification',
    content: [
      'Platform Name: CaryGoo',
      'Legal Entity: CaryGoo Technologies Private Limited',
      'CIN: U63090HR2026PTC109842',
      'Registered Address: Plot No. 44, Institutional Area, Sector 44, Gurugram, Haryana — 122003, India',
      'Website: app.carygoo.in',
      'Customer Support Email: support@carygoo.in',
    ],
  },
  {
    id: 'grievance-officer',
    title: 'Grievance Officer',
    content: [
      'In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, CaryGoo has appointed a Grievance Officer to address user complaints and grievances:',
      'Name: Jatin',
      'Designation: Grievance Officer',
      'Email: grievance@carygoo.in',
      'Phone: +91 99924 64637',
      'Address: CaryGoo Technologies Private Limited, Plot No. 44, Institutional Area, Sector 44, Gurugram, Haryana — 122003, India',
      'The Grievance Officer is responsible for receiving, acknowledging, and ensuring timely resolution of grievances in accordance with applicable law.',
    ],
  },
  {
    id: 'types-of-grievances',
    title: 'Types of Grievances',
    content: [
      'Users may submit grievances related to, but not limited to, the following:',
      'Account-related issues (registration, verification, suspension, deletion).',
      'Delivery-related complaints (failed delivery, damaged parcels, lost parcels, delayed delivery).',
      'Payment and refund disputes (payment failures, missing refunds, incorrect charges, payout issues).',
      'Privacy and data protection concerns (data access, correction, deletion requests).',
      'User conduct and safety issues (harassment, fraud, policy violations by other users).',
      'Platform functionality and service quality concerns.',
      'Concerns related to content displayed on the Platform.',
    ],
  },
  {
    id: 'submission-process',
    title: 'Complaint Submission Process',
    content: [
      'Users may submit complaints and grievances through the following channels:',
      'Email: Send a detailed complaint to support@carygoo.in for general support issues, or grievance@carygoo.in for formal grievances addressed to the Grievance Officer.',
      'In-App Support: Use the Support section within the CaryGoo mobile application or website to submit a complaint.',
      'When submitting a complaint, please include the following information to help us investigate and resolve the issue efficiently:',
      'Your registered name and email address.',
      'Booking reference number (if applicable).',
      'A clear and detailed description of the complaint, including dates, amounts, and relevant circumstances.',
      'Supporting evidence such as screenshots, photographs, or transaction references (if available).',
      'The resolution you are seeking.',
    ],
  },
  {
    id: 'acknowledgement',
    title: 'Complaint Acknowledgement',
    content: [
      'CaryGoo will acknowledge receipt of every complaint within twenty-four (24) hours of receipt via email or in-app notification.',
      'Each complaint will be assigned a unique ticket or reference number for tracking purposes. Users should retain this reference number for all follow-up communications.',
    ],
  },
  {
    id: 'resolution-timelines',
    title: 'Resolution Timelines',
    content: [
      'CaryGoo aims to resolve grievances within the following timelines, measured from the date of receipt of the complaint:',
      'General support queries (account, functionality): Within seven (7) days.',
      'Delivery-related complaints: Within fifteen (15) days.',
      'Payment and refund disputes: Within fifteen (15) days. Refund processing time, if applicable, is additional and depends on the payment gateway and the user\'s bank.',
      'Privacy and data protection requests: Within thirty (30) days, in accordance with applicable data protection law.',
      'Formal grievances addressed to the Grievance Officer: Within fifteen (15) days, as required under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.',
      'If a grievance requires additional time for investigation, the user will be informed of the expected timeline and the reason for the delay.',
    ],
  },
  {
    id: 'investigation-process',
    title: 'Investigation and Resolution Process',
    content: [
      'Upon receipt of a complaint, CaryGoo will:',
      'Review the complaint details and supporting evidence.',
      'Investigate the matter by examining relevant records, including booking details, transaction logs, delivery records, OTP verification data, communication logs, and statements from all involved parties.',
      'Contact the complainant for additional information if required.',
      'Determine an appropriate resolution based on the evidence and applicable policies.',
      'Communicate the resolution to the complainant with a clear explanation of the outcome.',
      'CaryGoo\'s resolution may include actions such as refunds, payouts, account actions against violating users, or other remedies as appropriate under the circumstances and applicable policies.',
    ],
  },
  {
    id: 'escalation',
    title: 'Escalation Process',
    content: [
      'If a user is not satisfied with the resolution provided by the customer support team, they may escalate the complaint using the following process:',
      'Level 1 — Customer Support: Submit the complaint through support@carygoo.in or in-app support. Resolution timeline: 7 to 15 days.',
      'Level 2 — Grievance Officer: If unsatisfied with the Level 1 response, escalate the complaint to the Grievance Officer at grievance@carygoo.in, referencing the original complaint ticket number. The Grievance Officer will review and respond within fifteen (15) days.',
      'Level 3 — External Recourse: If the user is still unsatisfied after the Grievance Officer\'s resolution, the user may:',
      'File a complaint with the appropriate Consumer Disputes Redressal Commission under the Consumer Protection Act, 2019.',
      'Approach the Data Protection Board of India (once constituted) for data protection related grievances under the Digital Personal Data Protection Act, 2023.',
      'Seek redressal through competent courts of law in India.',
      'CaryGoo respects the user\'s right to external recourse and will cooperate with regulatory authorities and consumer forums as required by law.',
    ],
  },
  {
    id: 'nodal-officer',
    title: 'Nodal Contact Person',
    content: [
      'For grievances that require urgent attention or that involve serious safety or legal concerns, users may also write to the Grievance Officer at grievance@carygoo.in with "URGENT" in the subject line.',
      'CaryGoo will prioritise such complaints and aim to acknowledge them within twelve (12) hours.',
    ],
  },
  {
    id: 'user-cooperation',
    title: 'User Cooperation',
    content: [
      'To facilitate effective grievance resolution, users are requested to:',
      'Provide accurate and complete information in their complaint.',
      'Respond to follow-up queries from the CaryGoo support team in a timely manner.',
      'Refrain from submitting duplicate complaints for the same issue, as this may delay resolution.',
      'Use the designated complaint channels described in this Policy.',
    ],
  },
  {
    id: 'policy-updates',
    title: 'Changes to This Policy',
    content: [
      'CaryGoo may update this Grievance Redressal Policy from time to time. Material changes will be communicated through the Platform.',
      'The most current version of this Policy is always available on the CaryGoo website.',
    ],
  },
  {
    id: 'contact-summary',
    title: 'Contact Summary',
    content: [
      'Customer Support: support@carygoo.in',
      'Grievance Officer: Jatin. Email: grievance@carygoo.in. Phone: +91 99924 64637.',
      'Registered Address: CaryGoo Technologies Private Limited, Plot No. 44, Institutional Area, Sector 44, Gurugram, Haryana — 122003, India',
      'CIN: U63090HR2026PTC109842',
    ],
  },
]

const relatedLinks = [
  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Cancellation & Refund', href: '/refund-cancellation' },
  { label: 'Shipping & Delivery', href: '/shipping-delivery' },
  { label: 'Payment & Settlement', href: '/payment-settlement' },
  { label: 'Prohibited Items', href: '/prohibited-items' },
  { label: 'Contact Us', href: '/contact' },
]

export default function GrievanceRedressalPage() {
  return (
    <LegalPage
      title='Grievance Redressal Policy'
      summary='This policy describes the complaint submission process, acknowledgement procedures, resolution timelines, and escalation mechanism available to users of the CaryGoo peer-to-peer intercity parcel delivery platform.'
      effectiveDate='14 November 2026'
      lastUpdated='14 November 2026'
      sections={sections}
      relatedLinks={relatedLinks}
    />
  )
}
