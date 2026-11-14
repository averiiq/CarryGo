import { LegalPage } from '@/components/marketing/legal-page'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata(
  'Payment and Settlement Policy',
  'Understand how payments are collected, processed, and settled on the CaryGoo peer-to-peer parcel delivery platform.',
  '/payment-settlement'
)

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content: [
      'This Payment and Settlement Policy ("Policy") describes how payments are collected from Senders, processed through authorised payment gateways, and settled to eligible Travelers on the CaryGoo platform.',
      'CaryGoo uses authorised third-party payment gateways to facilitate payment collection and processing. Payments collected from Senders are held by CaryGoo in a locked state until delivery is confirmed, after which the Traveler\'s earnings are released for settlement. CaryGoo does not itself act as a bank, payment aggregator authorised by the Reserve Bank of India (RBI), or escrow service provider unless explicitly stated and approved under applicable regulatory arrangements.',
      'By making a payment on the Platform, you agree to the terms described in this Policy and the terms of the applicable payment gateway.',
    ],
  },
  {
    id: 'accepted-methods',
    title: 'Accepted Payment Methods',
    content: [
      'Payment methods available on the Platform depend on the capabilities of the integrated payment gateway. Currently supported methods may include:',
      'UPI (Unified Payments Interface) — including payment through UPI apps.',
      'Debit Cards — Visa, Mastercard, and RuPay.',
      'Credit Cards — Visa, Mastercard, and RuPay.',
      'Net Banking — supported by major Indian banks.',
      'Wallet Payments — through supported digital wallet providers.',
      'The availability of specific payment methods may vary and is subject to change based on the payment gateway\'s capabilities and regulatory requirements.',
    ],
  },
  {
    id: 'payment-collection',
    title: 'Payment Collection Process',
    content: [
      'When a Sender confirms a booking, the total payable amount is collected through the payment gateway at the time of booking confirmation.',
      'Before completing payment, the Sender is shown a clear breakdown of the charges:',
      'Parcel delivery amount: The price for the delivery service as agreed between the Sender and Traveler or as determined by the Platform based on route, weight, and other factors.',
      'Platform service fee: A fee charged by CaryGoo for facilitating the transaction, communication, and verification services.',
      'Applicable taxes: Goods and Services Tax (GST) and any other applicable taxes, displayed separately.',
      'Total payable amount: The sum of the delivery amount, platform service fee, and applicable taxes.',
      'The Sender must review and confirm the payment breakdown before proceeding with the transaction.',
    ],
  },
  {
    id: 'payment-confirmation',
    title: 'Payment Confirmation',
    content: [
      'Upon successful payment, the Sender receives a confirmation through the Platform (in-app notification and/or email) with the booking reference number and payment details.',
      'If payment is not confirmed by the payment gateway, the booking is not created. The Sender may retry the payment or choose a different payment method.',
      'Transaction records are maintained on the Platform and are accessible to the Sender through their account.',
    ],
  },
  {
    id: 'payment-failures',
    title: 'Payment Failures and Duplicate Transactions',
    content: [
      'If a payment attempt fails, no booking is created and no charges are applied to the Sender.',
      'If the Sender\'s account is debited but the transaction is not confirmed on the Platform (due to network issues, gateway timeout, or technical errors), the amount is typically reversed automatically by the payment gateway or the Sender\'s bank within five (5) to seven (7) business days.',
      'In the event of a duplicate charge (the Sender is charged twice for the same booking), CaryGoo will refund the duplicate amount upon verification. Senders should contact support@carygoo.in with the relevant transaction reference numbers.',
    ],
  },
  {
    id: 'platform-charges',
    title: 'Platform Service Charges',
    content: [
      'CaryGoo charges a platform service fee for facilitating the connection between Senders and Travelers, providing communication and verification infrastructure, and operating the payment and dispute resolution systems.',
      'The platform service fee is calculated as a percentage of the delivery amount or as a fixed amount, depending on the transaction. The applicable fee is always disclosed to the Sender before payment.',
      'CaryGoo may revise its fee structure from time to time. Any changes to the fee structure will be communicated through the Platform and will apply to new bookings created after the effective date of the change.',
    ],
  },
  {
    id: 'traveler-earnings',
    title: 'Traveler Earnings',
    content: [
      'The Traveler\'s earnings for a completed delivery are calculated as the delivery amount collected from the Sender, less the applicable platform service fee and any taxes deducted at source (TDS) where applicable under the Income Tax Act, 1961.',
      'The Traveler can view their earnings summary, pending payouts, and completed payouts through their account on the Platform.',
    ],
  },
  {
    id: 'payout-conditions',
    title: 'Conditions for Traveler Payout',
    content: [
      'A Traveler becomes eligible for payout when all of the following conditions are met:',
      'The delivery has been confirmed through successful OTP verification by the recipient.',
      'No dispute or investigation is pending against the booking.',
      'The Traveler\'s KYC verification is complete and current.',
      'The Traveler has provided valid payout details (such as a UPI address or bank account) through the Platform.',
      'Any applicable hold period, if configured in the payment workflow, has elapsed.',
      'CaryGoo reserves the right to withhold or delay payouts in cases of suspected fraud, policy violations, pending investigations, or incomplete verification.',
    ],
  },
  {
    id: 'otp-delivery-verification',
    title: 'OTP-Based Delivery Verification and Payout Trigger',
    content: [
      'The dual-OTP verification system on CaryGoo serves as the primary mechanism for confirming successful delivery.',
      'At delivery, the recipient provides the delivery OTP to the Traveler, who confirms it through the Platform. This OTP confirmation:',
      'Marks the delivery as completed on the Platform.',
      'Triggers the Traveler\'s eligibility for payout (subject to the conditions in Section 8).',
      'Updates the booking status for both the Sender and Traveler.',
      'Disputes raised after OTP confirmation will be reviewed on a case-by-case basis. OTP confirmation is considered strong evidence of delivery completion.',
    ],
  },
  {
    id: 'settlement-processing',
    title: 'Settlement Processing',
    content: [
      'Once payout eligibility conditions are met, the payment status on the Platform changes from "locked" to "released", and CaryGoo initiates the settlement process.',
      'CaryGoo collects the full payment from the Sender through the payment gateway. There is no automatic split payment to the Traveler at the time of collection. Instead, the Traveler\'s payout is processed separately after delivery confirmation.',
      'Settlement timelines depend on the payout method and internal processing schedule. CaryGoo aims to process eligible payouts within a reasonable timeframe after delivery confirmation.',
      'Payouts are processed to the Traveler\'s registered payout method (such as UPI or bank account). CaryGoo does not process payouts to third-party accounts.',
      'Settlement amounts and dates are recorded on the Platform and accessible to the Traveler through their account.',
    ],
  },
  {
    id: 'refund-processing',
    title: 'Refund Processing',
    content: [
      'Refunds, when applicable, are processed through the original payment method used by the Sender. Refund eligibility, scenarios, and timelines are described in the Cancellation & Refund Policy.',
      'CaryGoo initiates eligible refunds promptly. The time for refunds to reflect in the Sender\'s account depends on the payment gateway and the Sender\'s bank or payment provider.',
    ],
  },
  {
    id: 'disputed-transactions',
    title: 'Disputed Transactions',
    content: [
      'If a Sender or Traveler disputes a payment, payout, or fee, they may raise a dispute through the Platform or by contacting support@carygoo.in.',
      'CaryGoo will review the dispute based on transaction records, booking details, delivery evidence, and communication logs.',
      'Disputed payouts may be held pending investigation. CaryGoo aims to resolve payment disputes within fifteen (15) days of receipt.',
      'Users retain the right to raise complaints with their bank, the payment gateway\'s grievance mechanism, or applicable consumer forums under Indian law.',
    ],
  },
  {
    id: 'payment-gateway',
    title: 'Payment Gateway and Data Security',
    content: [
      'All payment transactions are processed through authorised third-party payment gateways that comply with applicable security standards, including PCI-DSS where applicable.',
      'CaryGoo does not store, process, or have access to sensitive payment credentials such as full card numbers, CVVs, UPI PINs, or net banking passwords. These are handled directly by the payment gateway\'s secure infrastructure.',
      'By making a payment, you also agree to the payment gateway\'s terms of service and privacy policy.',
    ],
  },
  {
    id: 'transaction-records',
    title: 'Transaction Records and Receipts',
    content: [
      'The Platform maintains records of all transactions, including payment amounts, dates, booking references, payment methods, and settlement details.',
      'Senders and Travelers can access their transaction history through the Platform. CaryGoo may provide transaction summaries or receipts upon request.',
      'Transaction records are retained for a period consistent with applicable accounting, tax, and regulatory requirements (typically up to seven years).',
    ],
  },
  {
    id: 'payment-flow-summary',
    title: 'Payment Flow Summary',
    content: [
      'The end-to-end payment flow on CaryGoo works as follows:',
      'Step 1: The Sender reviews the payment breakdown (delivery amount + platform service fee + applicable taxes) and confirms payment.',
      'Step 2: Payment is collected from the Sender through the authorised payment gateway.',
      'Step 3: Upon successful payment, the booking is confirmed on the Platform.',
      'Step 4: The payment is held in a "locked" state on the Platform until delivery is completed.',
      'Step 5: The Traveler carries the parcel and completes delivery, confirmed through OTP verification. The payment status changes to "released".',
      'Step 6: CaryGoo processes the Traveler\'s payout (delivery amount less platform fee and applicable deductions) separately through the registered payout method.',
      'This flow ensures that payment is collected before delivery, held securely until delivery is verified through OTP, and Traveler payout is processed only after confirmed delivery.',
    ],
  },
  {
    id: 'tax-compliance',
    title: 'Tax Compliance',
    content: [
      'CaryGoo complies with applicable Goods and Services Tax (GST) regulations. GST on the platform service fee is included in the payment breakdown shown to the Sender.',
      'Where applicable under the Income Tax Act, 1961, Tax Deducted at Source (TDS) may be applied to Traveler payouts. Travelers are responsible for their own income tax compliance and reporting.',
      'CaryGoo may issue tax invoices or statements as required under applicable law.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact for Payment Queries',
    content: [
      'For payment-related questions, transaction issues, or payout inquiries, please contact CaryGoo support at:',
      'Email: support@carygoo.in. Phone: +91 99924 64637. Please include your booking reference number, transaction reference, and a description of the issue.',
    ],
  },
]

const relatedLinks = [
  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
  { label: 'Cancellation & Refund', href: '/refund-cancellation' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Shipping & Delivery', href: '/shipping-delivery' },
  { label: 'Prohibited Items', href: '/prohibited-items' },
  { label: 'Grievance Redressal', href: '/grievance-redressal' },
]

export default function PaymentSettlementPage() {
  return (
    <LegalPage
      title='Payment & Settlement Policy'
      summary='This policy explains how payments are collected from Senders, processed through authorised payment gateways, and settled to Travelers on the CaryGoo peer-to-peer intercity parcel delivery platform, including payment methods, fee structure, payout conditions, and transaction security.'
      effectiveDate='14 November 2026'
      lastUpdated='14 November 2026'
      sections={sections}
      relatedLinks={relatedLinks}
    />
  )
}
