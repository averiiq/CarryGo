import Link from 'next/link'

const sections = [
  {
    title: 'Acceptance of Terms',
    paragraphs: [
      'By using CarryGo websites, apps, and related services, you agree to these Terms and all applicable platform policies.',
      'If you do not agree, you must stop using the service.',
    ],
  },
  {
    title: 'Accounts and Eligibility',
    paragraphs: [
      'You must provide accurate account information and keep your credentials secure.',
      'CarryGo may suspend or restrict accounts involved in fraud, abuse, or policy violations.',
    ],
  },
  {
    title: 'Platform Role and Transactions',
    paragraphs: [
      'CarryGo enables sender and traveller coordination, communication, and payment workflows.',
      'Pricing, delivery timing, and acceptance are subject to route availability, verification checks, and platform rules.',
    ],
  },
  {
    title: 'Prohibited Use',
    paragraphs: [
      'Users must not post illegal, unsafe, restricted, or misdeclared parcels, or attempt to bypass verification and security checks.',
      'Any abuse of payment flows, identity systems, messaging, or dispute tools may lead to permanent removal and legal action.',
    ],
  },
  {
    title: 'Liability and Governing Law',
    paragraphs: [
      'CarryGo is provided on an as-is and as-available basis to the maximum extent permitted by law.',
      'These Terms are governed by the applicable laws of India and disputes are handled by competent courts where CarryGo is registered.',
    ],
  },
]

export default function TermsAndConditionsPage() {
  return (
    <div className='min-h-screen bg-background px-6 py-12'>
      <main className='max-w-4xl mx-auto space-y-8'>
        <header className='space-y-3'>
          <p className='text-sm text-primary font-semibold'>Legal</p>
          <h1 className='text-3xl font-heading font-bold'>Terms & Conditions</h1>
          <p className='text-muted'>Last updated: August 27, 2026</p>
          <div className='flex flex-wrap gap-4 text-sm'>
            <Link href='/privacy-policy' className='text-primary hover:underline'>Privacy</Link>
            <Link href='/refund-cancellation' className='text-primary hover:underline'>Refunds</Link>
            <Link href='/shipping-delivery' className='text-primary hover:underline'>Shipping</Link>
          </div>
        </header>
        {sections.map((section) => (
          <section key={section.title} className='space-y-2'>
            <h2 className='text-xl font-semibold'>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className='text-muted leading-relaxed'>{paragraph}</p>
            ))}
          </section>
        ))}
      </main>
    </div>
  )
}
