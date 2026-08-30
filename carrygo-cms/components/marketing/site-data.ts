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

export const publicNavLinks: NavItem[] = [
  { label: 'Features', href: '/features' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'For Senders', href: '/for-senders' },
  { label: 'For Travelers', href: '/for-travelers' },
  { label: 'Safety', href: '/safety' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
]

export const footerSections: FooterSection[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'How It Works', href: '/how-it-works' },
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
      'Coordinate time-sensitive document deliveries with clear milestones and handover confirmation.',
    name: 'Operations teams',
    role: 'Workflow example',
  },
  {
    quote:
      'Match parcel requests with relevant routes and keep both participants informed throughout delivery.',
    name: 'Growing businesses',
    role: 'Workflow example',
  },
  {
    quote:
      'Use planned journeys to carry suitable parcels through a structured, verification-led process.',
    name: 'Frequent travelers',
    role: 'Workflow example',
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
