import Link from 'next/link'

const sections = [
  {
    title: 'Information We Collect',
    paragraphs: [
      'We collect account details, parcel details, payment details, device identifiers, and support messages needed to run CarryGo services.',
      'We also collect usage and security logs to prevent fraud, enforce platform safety, and improve reliability.',
    ],
  },
  {
    title: 'How We Use Information',
    paragraphs: [
      'We use your information to create and manage accounts, match senders with travellers, process payments, resolve disputes, and provide support.',
      'We may use aggregated analytics to improve product quality, pricing controls, and trust and safety operations.',
    ],
  },
  {
    title: 'Sharing and Disclosure',
    paragraphs: [
      'We only share information required to complete deliveries, process payments, comply with law, prevent abuse, or operate trusted service providers.',
      'We do not sell personal information to third parties for unrelated advertising.',
    ],
  },
  {
    title: 'Data Retention and Rights',
    paragraphs: [
      'We retain information only as long as needed for legal, security, and operational purposes.',
      'You can request access, correction, or deletion of your personal data by emailing support@carrygo.in.',
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <div className='min-h-screen bg-background px-6 py-12'>
      <main className='max-w-4xl mx-auto space-y-8'>
        <header className='space-y-3'>
          <p className='text-sm text-primary font-semibold'>Legal</p>
          <h1 className='text-3xl font-heading font-bold'>Privacy Policy</h1>
          <p className='text-muted'>Last updated: August 27, 2026</p>
          <div className='flex flex-wrap gap-4 text-sm'>
            <Link href='/terms-and-conditions' className='text-primary hover:underline'>Terms</Link>
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
