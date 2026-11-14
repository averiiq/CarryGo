import { LegalPage } from '@/components/marketing/legal-page'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata(
  'Prohibited and Restricted Items Policy',
  'Review the list of items that cannot be transported through the CaryGoo peer-to-peer parcel delivery platform.',
  '/prohibited-items'
)

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content: [
      'CaryGoo is a peer-to-peer intercity parcel delivery marketplace. To ensure the safety of Travelers, Senders, recipients, and the general public, and to comply with applicable Indian laws and regulations, certain items are prohibited or restricted from being transported through the Platform.',
      'This Prohibited and Restricted Items Policy ("Policy") lists the categories of items that must not be sent through CaryGoo. By using the Platform, you agree to comply with this Policy.',
      'Senders are solely responsible for ensuring that the parcels they send do not contain prohibited or restricted items. Travelers who suspect that a parcel contains prohibited items must not carry it and should report the matter to CaryGoo support immediately.',
    ],
  },
  {
    id: 'illegal-drugs',
    title: 'Illegal Drugs and Narcotics',
    content: [
      'All illegal drugs, narcotics, psychotropic substances, and controlled substances as defined under the Narcotic Drugs and Psychotropic Substances Act, 1985 (NDPS Act), and any amendments or rules thereunder.',
      'Drug paraphernalia, precursor chemicals, and any substance intended for the manufacture or consumption of illegal drugs.',
    ],
  },
  {
    id: 'weapons',
    title: 'Weapons, Ammunition, and Explosives',
    content: [
      'Firearms, ammunition, gun parts, and accessories regulated under the Arms Act, 1959.',
      'Explosives, detonators, blasting caps, and incendiary devices regulated under the Explosives Act, 1884 and the Explosive Substances Act, 1908.',
      'Military or law enforcement equipment, tactical gear, and body armour.',
      'Knives, swords, and other bladed weapons exceeding permissible limits under applicable law.',
      'Firecrackers and pyrotechnic devices, except where explicitly permitted under local regulations and declared in advance.',
    ],
  },
  {
    id: 'flammable-hazardous',
    title: 'Flammable and Hazardous Materials',
    content: [
      'Flammable liquids including petrol, diesel, kerosene, lighter fluid, and industrial solvents.',
      'Compressed gases, aerosol canisters under pressure, and gas cylinders.',
      'Corrosive substances including strong acids, alkalis, and battery acid.',
      'Radioactive materials of any kind.',
      'Oxidising agents, organic peroxides, and other materials classified as dangerous goods under applicable transport safety regulations.',
    ],
  },
  {
    id: 'stolen-counterfeit',
    title: 'Stolen or Counterfeit Goods',
    content: [
      'Stolen property or goods obtained through theft, robbery, fraud, or any other unlawful means.',
      'Counterfeit goods, including items bearing forged trademarks, pirated software, replicas sold as genuine products, and counterfeit currency.',
      'Goods that infringe on the intellectual property rights (patents, copyrights, trademarks) of any third party.',
    ],
  },
  {
    id: 'cash-instruments',
    title: 'Cash and Negotiable Instruments',
    content: [
      'Currency notes and coins (Indian or foreign) in amounts exceeding the limits permitted under applicable law.',
      'Bearer cheques, demand drafts, promissory notes, and other negotiable instruments.',
      'Precious metals (gold, silver, platinum) in bullion or bar form.',
      'Uncut or loose precious stones and gems exceeding reasonable personal jewellery quantities.',
      'Note: Sending significant amounts of cash or valuables through a peer-to-peer platform carries inherent risk. CaryGoo strongly advises against sending such items.',
    ],
  },
  {
    id: 'live-animals',
    title: 'Live Animals',
    content: [
      'Live animals of any species, including pets, farm animals, insects, and aquatic creatures.',
      'Animal remains, taxidermy specimens, and biological samples containing animal tissue.',
      'Items derived from endangered or protected wildlife species as listed under the Wildlife Protection Act, 1972 and CITES.',
    ],
  },
  {
    id: 'perishable-goods',
    title: 'Perishable Goods',
    content: [
      'Food items, cooked meals, and perishable agricultural products that require temperature-controlled transport or have a short shelf life, unless both the Sender and Traveler explicitly agree to handle such items and accept the associated risk.',
      'Biological samples, blood products, and medical specimens that require cold chain transport.',
      'CaryGoo does not guarantee temperature-controlled transit and accepts no responsibility for spoilage or degradation of perishable items.',
    ],
  },
  {
    id: 'dangerous-chemicals',
    title: 'Dangerous Chemicals and Toxic Substances',
    content: [
      'Industrial chemicals, pesticides, insecticides, and herbicides.',
      'Poisons and toxic substances classified as hazardous under the Manufacture, Storage and Import of Hazardous Chemical Rules, 1989.',
      'Asbestos, lead-based products, and other substances known to cause serious health hazards.',
      'Bioterrorism agents and substances classified under the Chemical Weapons Convention Act, 2000.',
    ],
  },
  {
    id: 'medicines',
    title: 'Illegal or Restricted Medicines',
    content: [
      'Prescription medicines without a valid prescription from an authorised medical practitioner.',
      'Controlled substances and Schedule H, H1, and X drugs as classified under the Drugs and Cosmetics Act, 1940 and rules thereunder, unless accompanied by valid prescription and documentation.',
      'Unregulated, unapproved, or banned pharmaceutical products.',
      'Ayurvedic, homeopathic, or herbal preparations containing prohibited ingredients.',
    ],
  },
  {
    id: 'other-prohibited',
    title: 'Other Prohibited Items',
    content: [
      'Pornographic or obscene material prohibited under the Information Technology Act, 2000 or the Indian Penal Code.',
      'Materials promoting hatred, violence, terrorism, or sedition.',
      'Human remains, organs, and body parts.',
      'Items violating any applicable Indian central or state law, regulation, or court order.',
      'Any item that, in CaryGoo\'s reasonable judgement, poses a safety risk to the Traveler, other passengers, or the public.',
    ],
  },
  {
    id: 'consequences',
    title: 'Consequences of Sending Prohibited Items',
    content: [
      'CaryGoo reserves the right to take the following actions if a user is found to have sent, attempted to send, or carried prohibited items through the Platform:',
      'Immediate cancellation of the booking without refund.',
      'Temporary or permanent suspension of the user\'s account.',
      'Forfeiture of any payment associated with the transaction.',
      'Reporting the incident to law enforcement authorities, as required by law or deemed necessary by CaryGoo.',
      'Cooperation with law enforcement investigations and legal proceedings.',
      'CaryGoo may also hold the Sender liable for any damages, losses, costs, or legal consequences incurred by the Traveler, CaryGoo, or any third party as a result of transporting prohibited items.',
    ],
  },
  {
    id: 'traveler-obligations',
    title: 'Traveler Obligations Regarding Prohibited Items',
    content: [
      'Travelers are advised to verify the general nature of the parcel at the time of pickup (without opening sealed parcels). If a Traveler suspects that a parcel may contain prohibited items based on weight, smell, appearance, or other indicators, the Traveler should:',
      'Refuse to accept the parcel.',
      'Report the matter to CaryGoo support immediately through the Platform.',
      'If already in possession of a suspicious parcel, contact CaryGoo support before proceeding further.',
      'Travelers who knowingly carry prohibited items may face the same consequences described above.',
    ],
  },
  {
    id: 'declaration',
    title: 'Sender Declaration',
    content: [
      'By creating a delivery request on the Platform, the Sender declares and warrants that the parcel does not contain any prohibited or restricted items as defined in this Policy.',
      'The Sender accepts full responsibility for the contents of the parcel and agrees to indemnify CaryGoo and the Traveler against any claims, losses, or legal proceedings arising from prohibited items included in the parcel.',
    ],
  },
  {
    id: 'updates',
    title: 'Updates to This Policy',
    content: [
      'CaryGoo may update this Prohibited and Restricted Items Policy from time to time to reflect changes in applicable laws, regulations, or Platform policies. Material changes will be communicated through the Platform.',
      'Users are encouraged to review this Policy periodically.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    content: [
      'For questions about this Policy or to report prohibited items, please contact CaryGoo support at: support@carygoo.in. Phone: +91 99924 64637.',
    ],
  },
]

const relatedLinks = [
  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
  { label: 'Shipping & Delivery', href: '/shipping-delivery' },
  { label: 'Cancellation & Refund', href: '/refund-cancellation' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Payment & Settlement', href: '/payment-settlement' },
  { label: 'Grievance Redressal', href: '/grievance-redressal' },
]

export default function ProhibitedItemsPage() {
  return (
    <LegalPage
      title='Prohibited & Restricted Items Policy'
      summary='This policy defines the categories of items that are prohibited or restricted from being transported through the CaryGoo peer-to-peer intercity parcel delivery platform, and the consequences of violations.'
      effectiveDate='14 November 2026'
      lastUpdated='14 November 2026'
      sections={sections}
      relatedLinks={relatedLinks}
    />
  )
}
