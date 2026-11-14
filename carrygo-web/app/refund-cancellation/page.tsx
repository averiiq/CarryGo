import { LegalPage } from '@/components/marketing/legal-page'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata(
  'Cancellation and Refund Policy',
  'Review CaryGoo cancellation scenarios, refund eligibility, processing timelines, and dispute resolution for parcel deliveries.',
  '/refund-cancellation'
)

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content: [
      'This Cancellation and Refund Policy ("Policy") describes the terms under which bookings on the CaryGoo platform may be cancelled and refunds may be processed. This Policy applies to all Senders and Travelers using the Platform.',
      'Cancellation and refund outcomes depend on the stage of the delivery process at the time of cancellation, the reason for cancellation, and the available evidence. CaryGoo aims to resolve cancellation and refund matters fairly and transparently.',
    ],
  },
  {
    id: 'cancellation-before-acceptance',
    title: 'Cancellation Before Traveler Acceptance',
    content: [
      'If a Sender cancels a delivery request before any Traveler has accepted it, the cancellation is processed immediately at no cost.',
      'If payment was collected at the time of request creation, a full refund will be initiated. No deductions or penalties apply in this scenario.',
    ],
  },
  {
    id: 'sender-cancellation-after-acceptance',
    title: 'Cancellation by Sender After Acceptance but Before Pickup',
    content: [
      'If a Sender cancels after a Traveler has accepted the request but before the parcel has been picked up, the Sender is eligible for a refund of the delivery amount.',
      'CaryGoo may retain the platform service fee as a cancellation charge to compensate for the Traveler\'s time and opportunity cost. The applicable deduction, if any, will be communicated to the Sender at the time of cancellation.',
      'If the cancellation is due to circumstances beyond the Sender\'s reasonable control (such as a Traveler failing to arrive at the agreed pickup time), CaryGoo may waive the cancellation charge upon review.',
    ],
  },
  {
    id: 'traveler-cancellation-after-acceptance',
    title: 'Cancellation by Traveler After Acceptance but Before Pickup',
    content: [
      'If a Traveler cancels after accepting a delivery request but before picking up the parcel, the Sender will receive a full refund of the amount paid.',
      'Repeated cancellations by a Traveler after acceptance may result in account warnings, reduced visibility of their profile, or temporary suspension from accepting new requests.',
    ],
  },
  {
    id: 'cancellation-after-pickup',
    title: 'Cancellation After Pickup',
    content: [
      'Once a parcel has been picked up by the Traveler (confirmed through the Platform\'s pickup verification process), cancellation is generally not available through the standard cancellation flow.',
      'If a cancellation is necessary after pickup due to an emergency or unforeseen circumstance, the affected party should contact CaryGoo support immediately. Resolution in such cases will be handled on a case-by-case basis, considering the safety of the parcel, the circumstances described, and available evidence.',
      'If the Traveler is unable to complete the delivery after pickup, the Traveler is expected to arrange for the safe return of the parcel to the Sender or to an agreed alternative location, coordinated through CaryGoo support.',
    ],
  },
  {
    id: 'failed-pickup',
    title: 'Failed Pickup',
    content: [
      'If the Sender is not available at the agreed pickup location and time, and no alternative arrangement is made within a reasonable window, the booking may be treated as cancelled by the Sender. Standard Sender cancellation terms will apply.',
      'If the Traveler fails to arrive at the agreed pickup location and time, the Sender may cancel the booking and will receive a full refund. The incident will be recorded against the Traveler\'s account.',
    ],
  },
  {
    id: 'failed-delivery',
    title: 'Failed Delivery',
    content: [
      'If the Traveler is unable to deliver the parcel to the designated recipient for reasons within the Traveler\'s control, the matter will be treated as a delivery failure. CaryGoo will initiate a review and may process a full refund to the Sender.',
      'If the delivery fails due to reasons beyond the Traveler\'s control (such as an incorrect delivery address provided by the Sender, or the recipient being unavailable despite reasonable attempts), refund eligibility will be determined based on the specific circumstances and available evidence.',
    ],
  },
  {
    id: 'recipient-unavailable',
    title: 'Recipient Unavailable',
    content: [
      'If the intended recipient is not available at the delivery location, the Traveler should contact the Sender through the Platform to arrange an alternative delivery time or location.',
      'If no alternative arrangement can be made within a reasonable timeframe, the Traveler should contact CaryGoo support for guidance. The Traveler may be required to return the parcel to the Sender, and refund eligibility will be assessed accordingly.',
    ],
  },
  {
    id: 'payment-failure',
    title: 'Payment Failure',
    content: [
      'If a payment transaction fails during the booking process, no booking is created and no charges are applied.',
      'In cases where the amount is debited from the Sender\'s account but the transaction is not confirmed on the Platform (due to network issues, gateway timeout, or other technical reasons), the amount will typically be reversed automatically by the payment gateway or the Sender\'s bank within five (5) to seven (7) business days.',
      'If the amount is not reversed within this period, the Sender should contact CaryGoo support with the transaction reference number for assistance.',
    ],
  },
  {
    id: 'duplicate-payment',
    title: 'Duplicate Payment',
    content: [
      'If a Sender is charged multiple times for the same booking due to a technical error, CaryGoo will refund the duplicate amount upon verification.',
      'Senders who believe they have been charged twice should contact CaryGoo support with the relevant transaction reference numbers. After verification, the duplicate amount will be refunded through the original payment method.',
    ],
  },
  {
    id: 'refund-eligibility',
    title: 'Refund Eligibility Summary',
    content: [
      'Full refund: Cancellation before Traveler acceptance; cancellation by the Traveler before pickup; delivery failure attributable to the Traveler; duplicate payments.',
      'Refund less applicable deduction: Cancellation by Sender after Traveler acceptance but before pickup (platform service fee may be retained).',
      'Case-by-case review: Cancellation after pickup; failed delivery with mixed responsibility; recipient unavailable; disputes raised after delivery confirmation.',
      'No refund: Completed deliveries confirmed through OTP verification where no dispute is raised within the applicable dispute window; cancellations resulting from policy violations by the Sender.',
    ],
  },
  {
    id: 'applicable-deductions',
    title: 'Applicable Deductions',
    content: [
      'Where a cancellation charge or deduction applies, the specific amount will be clearly communicated to the user before the cancellation is confirmed.',
      'Deductions may include the platform service fee and, in exceptional cases, a reasonable compensation for the Traveler\'s incurred costs, as determined by CaryGoo based on the circumstances.',
    ],
  },
  {
    id: 'refund-process',
    title: 'Refund Initiation Process',
    content: [
      'Eligible refunds are initiated by CaryGoo after the cancellation is processed and eligibility is verified.',
      'Refunds are processed through the original payment method used for the transaction. CaryGoo does not process refunds to alternative payment methods or bank accounts other than the source of the original payment, except where the original method is no longer available.',
      'To request a refund or report a payment issue, contact CaryGoo support at support@carygoo.in with your booking reference and a description of the issue.',
    ],
  },
  {
    id: 'refund-timelines',
    title: 'Expected Refund Timelines',
    content: [
      'Once a refund is initiated by CaryGoo, the time for the refund to reflect in the Sender\'s account depends on the payment method and the Sender\'s bank or payment provider. Typical processing timelines are:',
      'UPI: 1 to 3 business days.',
      'Debit/Credit Card: 5 to 7 business days.',
      'Net Banking: 5 to 7 business days.',
      'Wallet Payments: 1 to 3 business days.',
      'These timelines are indicative and may vary depending on the payment gateway and the Sender\'s financial institution. CaryGoo is not responsible for delays caused by the payment gateway or the Sender\'s bank.',
    ],
  },
  {
    id: 'disputed-transactions',
    title: 'Disputed Transactions',
    content: [
      'If a Sender or Traveler disputes a transaction or refund decision, they may raise a formal dispute through CaryGoo support within seven (7) days of the transaction or incident.',
      'CaryGoo will review the dispute based on available evidence, including booking records, payment logs, communication history, OTP records, and parcel photographs.',
      'CaryGoo aims to resolve disputes within fifteen (15) days of receipt. Complex cases may require additional time, and the user will be kept informed of progress.',
      'Users retain the right to approach applicable consumer forums or courts under Indian law, independent of CaryGoo\'s internal dispute resolution process.',
    ],
  },
  {
    id: 'gateway-delays',
    title: 'Payment Gateway Processing Delays',
    content: [
      'Refund processing is dependent on the payment gateway and banking infrastructure. CaryGoo initiates refunds promptly, but actual credit to the user\'s account is subject to the payment gateway\'s and bank\'s processing timelines.',
      'In the event of significant delays beyond the timelines indicated above, users should first check with their bank or payment provider. If the issue persists, users may contact CaryGoo support for further assistance.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact for Cancellation and Refund Support',
    content: [
      'For cancellation requests, refund inquiries, or payment issues, please contact CaryGoo support at:',
      'Email: support@carygoo.in. Phone: +91 99924 64637. Please include your booking reference number, registered email, and a clear description of the issue.',
      'CaryGoo aims to acknowledge all cancellation and refund-related requests within two (2) business days.',
    ],
  },
]

const relatedLinks = [
  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Shipping & Delivery', href: '/shipping-delivery' },
  { label: 'Payment & Settlement', href: '/payment-settlement' },
  { label: 'Prohibited Items', href: '/prohibited-items' },
  { label: 'Grievance Redressal', href: '/grievance-redressal' },
]

export default function RefundCancellationPage() {
  return (
    <LegalPage
      title='Cancellation & Refund Policy'
      summary='This policy outlines the cancellation scenarios, refund eligibility criteria, applicable deductions, processing timelines, and dispute resolution procedures for deliveries facilitated through the CaryGoo platform.'
      effectiveDate='14 November 2026'
      lastUpdated='14 November 2026'
      sections={sections}
      relatedLinks={relatedLinks}
    />
  )
}
