import { LegalPage } from '@/components/marketing/legal-page'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata(
  'Terms and Conditions',
  'Read the terms governing use of the CaryGoo peer-to-peer intercity parcel delivery platform.',
  '/terms-and-conditions'
)

const sections = [
  {
    id: 'introduction',
    title: 'Introduction and Acceptance',
    content: [
      'These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") and CaryGoo Technologies Private Limited ("CaryGoo", "we", "us", or "our"), a company incorporated under the Companies Act, 2013, with registered office at Plot No. 44, Institutional Area, Sector 44, Gurugram, Haryana — 122003, India (CIN: U63090HR2026PTC109842).',
      'These Terms govern your access to and use of the CaryGoo mobile applications, website at app.carygoo.in, and all related services (collectively, the "Platform").',
      'By creating an account, accessing, or using the Platform in any manner, you agree to be bound by these Terms, our Privacy Policy, and all other policies referenced herein. If you do not agree to these Terms, you must not use the Platform.',
    ],
  },
  {
    id: 'platform-description',
    title: 'Platform Description',
    content: [
      'CaryGoo operates a technology-enabled marketplace that connects individuals who wish to send parcels between cities ("Senders") with individuals who are already travelling on intercity routes and are willing to carry eligible parcels ("Travelers").',
      'CaryGoo acts solely as an intermediary platform facilitating the connection, communication, and payment workflow between Senders and Travelers. CaryGoo does not itself transport, handle, or take physical custody of any parcels at any point during the delivery process.',
      'CaryGoo is not a courier service, postal service, logistics company, or transportation carrier. The actual delivery of parcels is performed by individual Travelers, who are independent users of the Platform and not employees, agents, or contractors of CaryGoo.',
    ],
  },
  {
    id: 'eligibility',
    title: 'Eligibility',
    content: [
      'To use the Platform, you must be at least eighteen (18) years of age and competent to enter into a binding contract under the Indian Contract Act, 1872.',
      'By registering on the Platform, you represent and warrant that all information provided during registration is accurate, current, and complete, and that you will maintain the accuracy of such information.',
      'CaryGoo reserves the right to refuse service, terminate accounts, or restrict access to the Platform at its discretion if we determine that eligibility requirements are not met or that the information provided is inaccurate.',
    ],
  },
  {
    id: 'account-registration',
    title: 'Account Registration and Verification',
    content: [
      'You must create an account to use the Platform. Account registration requires a valid email address and mobile number. Authentication is performed through a one-time password (OTP) sent to your registered email.',
      'You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify CaryGoo immediately if you suspect any unauthorised use of your account.',
      'Travelers who wish to accept and carry parcels are required to complete identity verification (Know Your Customer or "KYC") by providing valid government-issued identification (such as Aadhaar card or driving licence) and completing biometric facial liveness verification through our authorised verification partners.',
      'CaryGoo may, at its discretion, require additional verification steps or documentation from any user to maintain platform safety and compliance.',
    ],
  },
  {
    id: 'sender-responsibilities',
    title: 'Sender Responsibilities',
    content: [
      'Senders must provide accurate and complete details for each parcel, including a truthful description of contents, estimated weight, declared value, and clear parcel photographs.',
      'Senders must ensure that parcels are securely and appropriately packaged to withstand normal handling during transit. CaryGoo and Travelers are not responsible for damage resulting from inadequate packaging.',
      'Senders must not send prohibited or restricted items as defined in our Prohibited & Restricted Items Policy. Sending prohibited items may result in immediate cancellation, account suspension, forfeiture of payment, and reporting to law enforcement authorities where applicable.',
      'Senders must be available (or arrange for an authorised representative to be available) at the agreed pickup location and time. Failure to be available may be treated as a cancellation by the Sender.',
      'Senders must provide accurate pickup and delivery addresses and ensure that the intended recipient is available to receive the parcel at the destination.',
    ],
  },
  {
    id: 'traveler-responsibilities',
    title: 'Traveler Responsibilities',
    content: [
      'Travelers must complete KYC verification before accepting any delivery request.',
      'Travelers must only accept delivery requests on routes they are genuinely travelling and must deliver parcels within the agreed timeframe.',
      'Travelers must handle parcels with reasonable care during transit and must not open, tamper with, or inspect the internal contents of sealed parcels.',
      'Travelers must complete the OTP-based delivery verification process at both pickup and delivery to confirm proper handover.',
      'Travelers must not accept parcels that appear to contain prohibited or restricted items. If a Traveler suspects a parcel contains prohibited items after acceptance, they should contact CaryGoo support immediately.',
      'Travelers are responsible for complying with all applicable laws and regulations during transit, including any rules applicable to the mode of transport being used.',
    ],
  },
  {
    id: 'parcel-creation',
    title: 'Parcel Creation and Acceptance',
    content: [
      'Senders create delivery requests by providing parcel details, route information, and a price offer through the Platform.',
      'Travelers may browse available delivery requests and choose to accept requests that match their travel route, schedule, and carrying capacity.',
      'Acceptance of a delivery request by a Traveler creates a binding commitment between the Sender and the Traveler, subject to these Terms and the specific conditions displayed during the booking process.',
      'CaryGoo may, at its discretion, decline, modify, or cancel any delivery request that violates Platform policies or poses a safety concern.',
    ],
  },
  {
    id: 'packaging',
    title: 'Parcel Packaging Requirements',
    content: [
      'All parcels must be securely packaged in appropriate materials that protect the contents during normal transit conditions. Fragile items must be clearly marked and appropriately cushioned.',
      'Senders must provide clear, well-lit photographs of the parcel and its packaging at the time of creating the delivery request. These photographs serve as a record of the parcel\'s condition before pickup.',
      'Parcels must not exceed the weight and dimension limits specified by the Sender in the delivery request and accepted by the Traveler. Misrepresentation of parcel weight or dimensions may result in cancellation and account penalties.',
    ],
  },
  {
    id: 'photographs',
    title: 'Mandatory Parcel Photographs and Descriptions',
    content: [
      'Senders are required to upload photographs of the parcel at the time of creating a delivery request. These photographs must clearly show the parcel\'s external condition and packaging.',
      'Parcel descriptions must accurately represent the contents, weight, and any special handling requirements. Deliberately vague, misleading, or false descriptions constitute a violation of these Terms.',
      'CaryGoo may use parcel photographs and descriptions as evidence in dispute resolution proceedings.',
    ],
  },
  {
    id: 'pickup-delivery',
    title: 'Pickup and Delivery Procedures',
    content: [
      'Pickup and delivery locations, dates, and approximate times are coordinated between the Sender and Traveler through the Platform\'s communication features.',
      'At pickup, the Sender (or their authorised representative) hands over the parcel to the Traveler. An OTP verification may be required to confirm successful pickup.',
      'At delivery, the Traveler hands over the parcel to the intended recipient. The recipient must enter the delivery OTP to confirm receipt. Successful OTP entry serves as confirmation that the parcel has been delivered.',
      'Both parties are encouraged to verify the parcel\'s external condition at the time of handover.',
    ],
  },
  {
    id: 'otp-verification',
    title: 'OTP-Based Delivery Confirmation',
    content: [
      'CaryGoo uses a dual-OTP verification system to secure parcel handovers. OTP codes are generated by the Platform and communicated to the relevant parties.',
      'The delivery OTP must be entered by the recipient to confirm successful delivery. This OTP confirmation triggers downstream processes including delivery status updates and eligibility for Traveler payout.',
      'Users must not share OTP codes with any third party other than the intended recipient at the time of delivery. Sharing OTPs prematurely or with unauthorised individuals may compromise delivery security.',
      'OTP verification serves as the primary evidence of delivery completion on the Platform. Disputes raised after OTP confirmation will be evaluated on a case-by-case basis.',
    ],
  },
  {
    id: 'communication',
    title: 'Communication Between Users',
    content: [
      'The Platform provides in-app messaging to facilitate communication between Senders and Travelers for delivery coordination.',
      'Users must use the in-app communication tools for all delivery-related communication. CaryGoo may monitor and record these communications for safety, fraud prevention, and dispute resolution purposes.',
      'Users must not use the Platform\'s communication features to send spam, offensive content, solicitations for external services, or any communication unrelated to delivery coordination.',
      'Users must not share personal contact details (phone numbers, addresses, social media handles) through the Platform for purposes unrelated to the delivery at hand.',
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing and Platform Charges',
    content: [
      'Parcel delivery pricing on the Platform is based on factors including route, distance, parcel weight, urgency, and the price offer set by the Sender or negotiated between the Sender and Traveler.',
      'CaryGoo may charge a platform service fee on transactions facilitated through the Platform. The applicable service fee will be clearly displayed to the Sender before payment confirmation.',
      'Applicable taxes (including Goods and Services Tax, where applicable) will be displayed separately in the payment breakdown.',
      'All prices displayed on the Platform are in Indian Rupees (INR).',
    ],
  },
  {
    id: 'payment-collection',
    title: 'Payment Collection and Processing',
    content: [
      'Payments on the Platform are collected from Senders through authorised third-party payment gateways. Accepted payment methods depend on the payment gateway\'s capabilities and may include UPI, debit cards, credit cards, net banking, and wallet payments.',
      'Payment is collected at the time of booking confirmation. By making a payment, the Sender authorises the payment gateway to process the specified amount.',
      'CaryGoo does not directly handle, process, or store sensitive payment credentials. All payment processing is handled by the authorised payment gateway in compliance with applicable security standards.',
      'In the event of a payment failure, the Sender will be notified and may retry the payment. Amounts debited for failed transactions will be refunded as per the payment gateway\'s processing timelines.',
    ],
  },
  {
    id: 'traveler-payout',
    title: 'Traveler Payout and Settlement',
    content: [
      'Travelers become eligible for payout after successful delivery is confirmed through OTP verification and any applicable settlement conditions are met.',
      'The Traveler\'s earnings are calculated as the delivery amount less any applicable platform service fee and taxes.',
      'Payout processing timelines and methods are subject to the payment infrastructure configuration and may vary. CaryGoo will process eligible payouts within a reasonable timeframe after delivery confirmation.',
      'CaryGoo reserves the right to withhold or delay payouts in cases of suspected fraud, policy violations, ongoing disputes, or incomplete verification.',
      'Details of the payment flow, settlement conditions, and payout process are further described in our Payment & Settlement Policy.',
    ],
  },
  {
    id: 'cancellations-refunds',
    title: 'Cancellations and Refunds',
    content: [
      'Cancellation and refund terms vary depending on the stage of the delivery process. Detailed cancellation scenarios, refund eligibility, applicable deductions, and processing timelines are described in our Cancellation & Refund Policy.',
      'CaryGoo reserves the right to cancel any booking that violates Platform policies, involves prohibited items, or poses a safety risk, with or without prior notice to the user.',
    ],
  },
  {
    id: 'disputes',
    title: 'Disputes Between Sender and Traveler',
    content: [
      'In the event of a dispute between a Sender and a Traveler regarding a delivery (including disputes about parcel condition, delivery timing, or payment), either party may raise a dispute through the Platform or by contacting CaryGoo support.',
      'CaryGoo will review available evidence including delivery logs, OTP records, parcel photographs, communication records, and statements from both parties.',
      'CaryGoo\'s dispute resolution is intended to be fair and transparent. However, CaryGoo acts as a marketplace intermediary, and its dispute resolution decisions are based on the evidence and policies available. CaryGoo\'s role in dispute resolution does not make it a party to the delivery contract between the Sender and Traveler.',
      'Users retain the right to seek redressal through applicable consumer forums, courts, or alternative dispute resolution mechanisms under Indian law, independent of CaryGoo\'s internal resolution process.',
    ],
  },
  {
    id: 'damaged-lost',
    title: 'Damaged, Lost, Delayed, or Undelivered Parcels',
    content: [
      'CaryGoo is not a carrier and does not take physical custody of parcels. Responsibility for parcel safety during transit rests primarily with the Traveler carrying the parcel.',
      'In the event of a damaged, lost, delayed, or undelivered parcel, the affected user should report the issue through the Platform or contact CaryGoo support promptly with relevant evidence.',
      'CaryGoo will investigate reported incidents and may facilitate resolution including refunds, partial refunds, or other remedies as appropriate under its policies. Resolution outcomes depend on the evidence available and the specific circumstances of each case.',
      'CaryGoo\'s liability for any individual delivery is limited to the platform service fee charged for that transaction, except where a greater liability is required under applicable consumer protection laws that cannot be excluded by contract.',
    ],
  },
  {
    id: 'fraud-prevention',
    title: 'Fraud Prevention and Suspicious Activities',
    content: [
      'CaryGoo employs automated and manual monitoring systems to detect and prevent fraudulent activities, including but not limited to fake accounts, fraudulent bookings, payment fraud, identity misrepresentation, and manipulation of the rating system.',
      'If CaryGoo detects or reasonably suspects fraudulent or suspicious activity associated with your account, CaryGoo may immediately suspend your account, withhold payments, cancel active bookings, and report the activity to law enforcement authorities.',
      'Users must not engage in any activity that manipulates, circumvents, or exploits Platform systems, pricing mechanisms, referral programmes, or promotional offers.',
    ],
  },
  {
    id: 'ratings-reviews',
    title: 'User Ratings and Reviews',
    content: [
      'After delivery completion, both Senders and Travelers may rate and review each other. Ratings and reviews are used to build trust within the community and to help other users make informed decisions.',
      'Ratings and reviews must be honest, accurate, and based on the actual delivery experience. Fake, incentivised, retaliatory, or defamatory reviews are prohibited and may be removed by CaryGoo.',
      'CaryGoo reserves the right to moderate, edit, or remove reviews that violate Platform policies or applicable laws.',
    ],
  },
  {
    id: 'account-suspension',
    title: 'Account Suspension and Termination',
    content: [
      'CaryGoo may suspend, restrict, or permanently terminate your account if you violate these Terms, engage in prohibited activities, fail to complete KYC verification when required, or pose a risk to the safety of other users or the Platform.',
      'You may request deletion of your account at any time as described in our Privacy Policy. Termination of your account does not release you from any obligations that arose prior to termination, including payment obligations and ongoing dispute resolution.',
      'Upon termination, your right to use the Platform ceases immediately. CaryGoo may retain data associated with your account as described in the Privacy Policy and as required by applicable law.',
    ],
  },
  {
    id: 'platform-limitations',
    title: 'Platform Limitations and Liability',
    content: [
      'The Platform is provided on an "as is" and "as available" basis. CaryGoo does not guarantee uninterrupted, error-free, or secure access to the Platform at all times.',
      'CaryGoo does not guarantee the availability of Travelers on any specific route, the successful completion of any delivery, or specific delivery timelines.',
      'To the maximum extent permitted by applicable law, CaryGoo shall not be liable for any indirect, incidental, consequential, special, or punitive damages arising from your use of the Platform.',
      'Nothing in these Terms excludes or limits CaryGoo\'s liability where such exclusion or limitation would be prohibited by applicable Indian consumer protection laws, including the Consumer Protection Act, 2019.',
    ],
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    content: [
      'All content, features, functionality, software, designs, trademarks, logos, and other intellectual property displayed on or through the Platform are owned by CaryGoo or its licensors and are protected under applicable intellectual property laws.',
      'You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform for its intended purposes, subject to these Terms.',
      'You must not copy, modify, distribute, sell, lease, reverse engineer, or create derivative works from any part of the Platform without CaryGoo\'s prior written consent.',
      'User-generated content (including parcel photographs, reviews, and messages) remains the property of the respective user, but by submitting such content to the Platform, you grant CaryGoo a non-exclusive, royalty-free, worldwide licence to use, display, and reproduce such content for Platform operations, safety, and promotional purposes.',
    ],
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    content: [
      'You agree to indemnify, defend, and hold harmless CaryGoo, its directors, officers, employees, and agents from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable legal fees) arising from or related to:',
      'Your use of or inability to use the Platform.',
      'Your violation of these Terms or any applicable law.',
      'Your violation of the rights of any third party, including other users of the Platform.',
      'Any content you submit or transmit through the Platform.',
      'Any parcel you send or carry through the Platform, including any prohibited or misdeclared items.',
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing Law and Jurisdiction',
    content: [
      'These Terms are governed by and construed in accordance with the laws of India.',
      'Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts located in Gurugram, Haryana, India.',
      'Nothing in this clause prevents you from approaching any consumer forum or other authority where you have a statutory right to do so under applicable Indian consumer protection laws.',
    ],
  },
  {
    id: 'changes-to-terms',
    title: 'Changes to Terms',
    content: [
      'CaryGoo reserves the right to modify these Terms at any time. Material changes will be communicated through the Platform, via email, or through in-app notifications prior to the changes taking effect.',
      'Your continued use of the Platform after the effective date of any modification constitutes your acceptance of the modified Terms. If you do not agree with the changes, you should stop using the Platform and request account deletion.',
    ],
  },
  {
    id: 'contact-grievance',
    title: 'Contact and Grievance Details',
    content: [
      'For questions or concerns regarding these Terms, please contact us at:',
      'CaryGoo Technologies Private Limited. Email: support@carygoo.in. Grievance email: grievance@carygoo.in. Phone: +91 99924 64637. Registered address: Plot No. 44, Institutional Area, Sector 44, Gurugram, Haryana — 122003, India. CIN: U63090HR2026PTC109842.',
      'Grievance Officer: Jatin. Email: grievance@carygoo.in. Phone: +91 99924 64637. For detailed grievance redressal procedures, please refer to our Grievance Redressal Policy.',
    ],
  },
]

const relatedLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Cancellation & Refund', href: '/refund-cancellation' },
  { label: 'Shipping & Delivery', href: '/shipping-delivery' },
  { label: 'Prohibited Items', href: '/prohibited-items' },
  { label: 'Payment & Settlement', href: '/payment-settlement' },
  { label: 'Grievance Redressal', href: '/grievance-redressal' },
]

export default function TermsAndConditionsPage() {
  return (
    <LegalPage
      title='Terms & Conditions'
      summary='These Terms and Conditions define the rules, responsibilities, and legal framework governing the use of the CaryGoo peer-to-peer intercity parcel delivery platform by Senders, Travelers, and all other users.'
      effectiveDate='14 November 2026'
      lastUpdated='14 November 2026'
      sections={sections}
      relatedLinks={relatedLinks}
    />
  )
}
