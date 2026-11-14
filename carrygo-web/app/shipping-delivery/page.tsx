import { LegalPage } from '@/components/marketing/legal-page'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata(
  'Shipping and Delivery Policy',
  'Understand how CaryGoo peer-to-peer deliveries work, including route matching, pickup procedures, OTP verification, and delivery expectations.',
  '/shipping-delivery'
)

const sections = [
  {
    id: 'delivery-model',
    title: 'Peer-to-Peer Delivery Model',
    content: [
      'CaryGoo operates a peer-to-peer (P2P) delivery model. Unlike conventional courier or logistics companies, CaryGoo does not maintain a fleet of delivery vehicles, warehouses, or sorting facilities. CaryGoo does not take physical custody of parcels at any point.',
      'Instead, CaryGoo connects Senders (individuals who need to send parcels between cities) with Travelers (individuals who are already travelling on intercity routes and are willing to carry eligible parcels along their journey).',
      'Deliveries are performed by individual Travelers, who are independent users of the Platform and not employees, agents, or contractors of CaryGoo. CaryGoo facilitates the technology, communication, payment, and verification infrastructure to make these connections safe and reliable.',
    ],
  },
  {
    id: 'delivery-requests',
    title: 'How Delivery Requests Work',
    content: [
      'A Sender creates a delivery request on the Platform by providing parcel details (description, photographs, weight, declared value), the pickup city and address, the delivery city and address, the preferred delivery date, and a price offer.',
      'The delivery request is published on the Platform and becomes visible to Travelers whose posted travel routes match the requested route.',
      'Travelers may browse available delivery requests, review parcel details, and choose to accept requests that align with their travel schedule and capacity.',
      'Once a Traveler accepts a request, both parties are connected through the Platform to coordinate pickup and delivery details.',
    ],
  },
  {
    id: 'route-matching',
    title: 'Route Matching',
    content: [
      'CaryGoo\'s route matching system connects delivery requests with Travelers based on origin city, destination city, travel date, and available carrying capacity.',
      'Route matching is based on the information provided by both Senders and Travelers. Accuracy of matching depends on the accuracy of information entered by users.',
      'CaryGoo does not guarantee that a matching Traveler will be available for every delivery request. Availability depends on the number of Travelers active on a given route and date.',
    ],
  },
  {
    id: 'pickup-procedures',
    title: 'Pickup Procedures',
    content: [
      'After a Traveler accepts a delivery request, the Sender and Traveler coordinate the pickup location, date, and approximate time through the Platform\'s in-app messaging.',
      'At the time of pickup, the Sender (or their authorised representative) hands over the parcel to the Traveler in person. Both parties should verify the parcel\'s external condition at the time of handover.',
      'An OTP-based verification may be used at pickup to confirm the handover. The Sender provides or confirms the pickup OTP to the Traveler through the Platform.',
      'Senders must ensure they are available at the agreed pickup location and time. If the Sender is not available and no alternative arrangement is made within a reasonable window, the booking may be treated as a failed pickup.',
    ],
  },
  {
    id: 'parcel-handover',
    title: 'Parcel Handover and Care',
    content: [
      'Travelers are expected to handle parcels with reasonable care during transit, protecting them from damage, theft, and exposure to adverse conditions.',
      'Travelers must not open, inspect, or tamper with the contents of sealed parcels. If a Traveler suspects a parcel contains prohibited items, they should contact CaryGoo support immediately.',
      'CaryGoo does not provide insurance coverage for parcels in transit. Senders are advised to consider the nature and value of items being sent and to package them appropriately.',
    ],
  },
  {
    id: 'packaging',
    title: 'Packaging Requirements',
    content: [
      'Senders are responsible for ensuring that parcels are securely and appropriately packaged before handover to the Traveler.',
      'Parcels should be packed in sturdy materials that protect the contents during normal transit conditions, including movement, minor impacts, and weather exposure.',
      'Fragile items must be clearly marked as "FRAGILE" and cushioned with appropriate protective materials (bubble wrap, foam, etc.).',
      'Liquids must be sealed in leak-proof containers and packaged with absorbent material.',
      'CaryGoo and Travelers are not responsible for damage to parcels resulting from inadequate, improper, or insufficient packaging by the Sender.',
    ],
  },
  {
    id: 'otp-verification',
    title: 'Delivery Verification Through OTP',
    content: [
      'CaryGoo uses a dual-OTP verification system to confirm parcel handovers securely.',
      'At delivery, the Platform generates a delivery OTP that is communicated to the Sender or the intended recipient. The Traveler requests this OTP from the recipient at the time of delivery.',
      'The recipient enters or provides the delivery OTP to the Traveler, who confirms it through the Platform. Successful OTP verification serves as the primary confirmation that the parcel has been delivered to the intended recipient.',
      'OTP verification triggers delivery completion on the Platform, which in turn initiates downstream processes including Traveler payout eligibility.',
      'Users must not share OTP codes prematurely or with anyone other than the intended party at the time of the actual handover.',
    ],
  },
  {
    id: 'delivery-timelines',
    title: 'Estimated Delivery Timelines',
    content: [
      'Delivery timelines on the Platform are estimated based on the Traveler\'s posted travel schedule and are not guaranteed.',
      'Actual delivery times depend on factors including the Traveler\'s mode and schedule of transport, traffic and road conditions, weather, and any unforeseen circumstances during travel.',
      'CaryGoo does not promise or guarantee specific delivery dates or times. Estimated delivery windows displayed on the Platform are indicative and provided for planning purposes only.',
      'For time-sensitive deliveries, Senders should communicate urgency clearly and confirm the Traveler\'s expected timeline before confirming the booking.',
    ],
  },
  {
    id: 'delays',
    title: 'Delays and Unexpected Circumstances',
    content: [
      'Deliveries may be delayed due to circumstances beyond the Traveler\'s or CaryGoo\'s control, including but not limited to traffic disruptions, vehicle breakdowns, adverse weather conditions, natural disasters, road closures, or personal emergencies.',
      'In the event of a significant delay, the Traveler is expected to update the Sender through the Platform\'s communication tools. If the Traveler is unable to complete the delivery, they should contact CaryGoo support to arrange an appropriate resolution.',
      'CaryGoo is not liable for delays in delivery, but will assist in coordinating between Senders and Travelers to find a reasonable resolution.',
    ],
  },
  {
    id: 'failed-delivery',
    title: 'Failed Delivery',
    content: [
      'A delivery is considered failed when the Traveler is unable to deliver the parcel to the designated recipient despite reasonable efforts.',
      'Reasons for failed delivery may include an incorrect delivery address provided by the Sender, the recipient being unavailable at the delivery location, the Sender requesting cancellation after pickup, or the Traveler being unable to complete the journey.',
      'In the event of a failed delivery, the affected parties should contact CaryGoo support. CaryGoo will coordinate with both parties to arrange for the parcel\'s safe return to the Sender or an alternative resolution.',
      'Refund eligibility for failed deliveries is governed by the Cancellation & Refund Policy.',
    ],
  },
  {
    id: 'recipient-availability',
    title: 'Recipient Availability',
    content: [
      'Senders must ensure that the intended recipient is available at the delivery location to receive the parcel and provide the delivery OTP.',
      'If the recipient is not available at the scheduled delivery time, the Traveler should contact the Sender through the Platform to arrange an alternative time or handover point.',
      'If the recipient cannot be reached within a reasonable timeframe, the Traveler should contact CaryGoo support. CaryGoo will work with both parties to determine next steps.',
    ],
  },
  {
    id: 'parcel-safety',
    title: 'Parcel Safety and Loss',
    content: [
      'While CaryGoo takes measures to verify Traveler identities and facilitate secure handovers through OTP verification, CaryGoo does not bear insurance or carrier liability for parcels in transit.',
      'In the event of loss or damage during transit, the affected user should report the incident to CaryGoo support promptly with all available evidence (photographs, communication logs, booking details).',
      'CaryGoo will investigate and may facilitate a resolution, which could include a refund or other remedy as determined on a case-by-case basis under our policies.',
      'Senders are advised not to send items of very high monetary or sentimental value through the Platform without understanding the peer-to-peer nature of the delivery model and the associated risks.',
    ],
  },
  {
    id: 'delivery-disputes',
    title: 'Delivery Disputes',
    content: [
      'If a dispute arises regarding the condition of the parcel upon delivery, the delivery timing, or any other aspect of the delivery, either party may raise a dispute through CaryGoo support.',
      'CaryGoo will review the available evidence, including OTP records, parcel photographs, delivery logs, and communications, and will make a determination based on the circumstances.',
      'Users retain the right to seek redressal through applicable consumer forums or courts under Indian law, independent of CaryGoo\'s internal dispute resolution.',
    ],
  },
  {
    id: 'responsibilities',
    title: 'Responsibilities of Sender and Traveler',
    content: [
      'Sender responsibilities include: providing accurate parcel details and photographs; secure packaging; ensuring pickup availability; providing a correct delivery address; ensuring recipient availability; not sending prohibited items; and providing the delivery OTP only to the actual recipient at the time of handover.',
      'Traveler responsibilities include: completing KYC verification; accepting only routes they are genuinely travelling; handling parcels with reasonable care; completing OTP verification at pickup and delivery; not opening or tampering with parcels; reporting suspected prohibited items; and communicating delays promptly.',
      'CaryGoo\'s role is limited to providing the technology platform, facilitating communication and payment processing, operating the OTP verification system, and assisting with dispute resolution. CaryGoo does not assume the role or liability of a carrier, courier, insurer, or guarantor of delivery.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact for Delivery Issues',
    content: [
      'For delivery-related issues, delays, or disputes, please contact CaryGoo support at:',
      'Email: support@carygoo.in. Phone: +91 99924 64637. Please include your booking reference number and a description of the issue.',
    ],
  },
]

const relatedLinks = [
  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Cancellation & Refund', href: '/refund-cancellation' },
  { label: 'Prohibited Items', href: '/prohibited-items' },
  { label: 'Payment & Settlement', href: '/payment-settlement' },
  { label: 'Grievance Redressal', href: '/grievance-redressal' },
]

export default function ShippingDeliveryPage() {
  return (
    <LegalPage
      title='Shipping & Delivery Policy'
      summary="This policy explains how CaryGoo's peer-to-peer delivery model works, including delivery request creation, route matching, pickup and delivery procedures, OTP-based verification, delivery timelines, and the responsibilities of Senders and Travelers."
      effectiveDate='14 November 2026'
      lastUpdated='14 November 2026'
      sections={sections}
      relatedLinks={relatedLinks}
    />
  )
}
