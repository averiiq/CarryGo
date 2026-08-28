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
  { label: 'Cities Connected', value: '120+' },
  { label: 'Average Delivery Time', value: '< 36h' },
  { label: 'Verified Travelers', value: '15k+' },
  { label: 'Successful Deliveries', value: '98.7%' },
]

export const testimonials: Testimonial[] = [
  {
    quote:
      'CarryGo helped us ship urgent medical documents overnight without premium courier rates.',
    name: 'Nisha Kapoor',
    role: 'Operations Lead, HealthBridge Labs',
  },
  {
    quote:
      'The traveler matching and OTP handover flow is smooth. We now use CarryGo for intercity parts delivery.',
    name: 'Raghav Mehta',
    role: 'Founder, UrbanWrench',
  },
  {
    quote:
      'I travel weekly for work, and CarryGo gives me safe, structured ways to earn extra from routes I already take.',
    name: 'Aman Verma',
    role: 'Verified Traveler, Bengaluru',
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
