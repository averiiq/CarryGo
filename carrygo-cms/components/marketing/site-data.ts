export type NavItem = {
  label: string
  href: string
}

export type FooterSection = {
  title: string
  links: NavItem[]
}

export type Testimonial = {
  quote: string
  name: string
  role: string
}

export type FaqItem = {
  question: string
  answer: string
}

export const primaryNavLinks: NavItem[] = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Send Parcel', href: '/create-parcel' },
  { label: 'Travel & Earn', href: '/create-trip' },
  { label: 'Find Routes', href: '/search' },
  { label: 'Safety', href: '/safety' },
]

export const secondaryNavLinks: NavItem[] = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'For Senders', href: '/for-senders' },
  { label: 'For Travelers', href: '/for-travelers' },
  { label: 'About Us', href: '/about' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
]

export const publicNavLinks: NavItem[] = [
  ...primaryNavLinks,
  ...secondaryNavLinks,
]

export const footerSections: FooterSection[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Create Trip', href: '/create-trip' },
      { label: 'Create Parcel', href: '/create-parcel' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Search', href: '/search' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Safety', href: '/safety' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'For Senders', href: '/for-senders' },
      { label: 'For Travelers', href: '/for-travelers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms & Conditions', href: '/terms-and-conditions' },
      { label: 'Refund & Cancellation', href: '/refund-cancellation' },
      { label: 'Shipping & Delivery', href: '/shipping-delivery' },
    ],
  },
]

export const quickStats = [
  { label: 'Route Coverage', value: 'Flexible' },
  { label: 'Handover', value: 'OTP' },
  { label: 'Traveler Checks', value: 'KYC' },
  { label: 'Payment Flow', value: 'Protected' },
]

export const testimonials: Testimonial[] = [
  {
    quote:
      'I needed to send an urgent signed agreement from Mumbai to Pune within 4 hours. Traditional couriers quoted next-day 6 PM. Found an IT consultant driving to Pune on CarryGo who delivered it directly by 3 PM. Absolute lifesaver!',
    name: 'Arjun Mehta',
    role: 'Founder, Apex Media (Mumbai)',
  },
  {
    quote:
      'I travel twice a week between Bangalore and Hyderabad for client meetings. Carrying 2 small packages each trip covers almost my entire round-trip travel expense. The dual-OTP system gives complete peace of mind.',
    name: 'Kavita Sundaram',
    role: 'Management Consultant & Frequent Traveler',
  },
  {
    quote:
      'We run an artisanal craft store in Delhi and use CarryGo for urgent customer orders to Jaipur and Chandigarh. Customers are thrilled when packages arrive the very same evening. 60% cheaper than priority courier services!',
    name: 'Rohan Deshmukh',
    role: 'Co-founder, CraftNook Organics',
  },
]

export const frequentlyAskedQuestions: FaqItem[] = [
  {
    question: 'How does CarryGo keep deliveries secure?',
    answer:
      'CarryGo enforces KYC checks, risk flags, OTP-based handovers, and route-level monitoring to protect both sender and traveler journeys.',
  },
  {
    question: 'Can businesses use CarryGo at scale?',
    answer:
      'Yes. We support recurring route operations, API-friendly workflows, and operational insights for growing fulfillment teams.',
  },
  {
    question: 'How are delivery fees calculated?',
    answer:
      'Pricing considers route demand, parcel weight and urgency, plus optional protection coverage. You see total charges before confirming.',
  },
  {
    question: 'What if there is a delay or failed handover?',
    answer:
      'Our support and dispute workflows review event logs and evidence quickly, then apply policy-based resolution or refunds when eligible.',
  },
]
