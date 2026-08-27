import Link from 'next/link'

const sections = [
  {
    title: 'Cancellation Before Pickup',
    paragraphs: [
      'If a sender cancels before parcel pickup is confirmed, CarryGo applies a full refund to the original payment method.',
      'Processing times depend on payment gateway and bank timelines.',
    ],
  },
  {
    title: 'After Pickup and Disputes',
    paragraphs: [
      'After pickup, refunds are handled through dispute review based on delivery evidence, communication logs, and policy compliance.',
      'CarryGo may issue full, partial, or no refund depending on case outcome.',
    ],
  },
  {
    title: 'After Delivery Confirmation',
    paragraphs: [
      'Once delivery confirmation and payment release are complete, refunds are not automatic and require support escalation.',
      'Fraud or policy abuse can result in account action in addition to refund denial.',
    ],
  },
  {
    title: 'How to Request Support',
    paragraphs: [
      'For cancellation and refund support, contact support@carrygo.in with booking reference and issue details.',
      'We aim to acknowledge refund-related requests within two business days.',
    ],
  },
]

export default function RefundCancellationPage() {
  return (
    <div className='min-h-screen bg-background px-6 py-12'>
      <main className='max-w-4xl mx-auto space-y-8'>
        <header className='space-y-3'>
          <p className='text-sm text-primary font-semibold'>Legal</p>
          <h1 className='text-3xl font-heading font-bold'>Refund & Cancellation Policy</h1>
          <p className='text-muted'>Last updated: August 27, 2026</p>
          <div className='flex flex-wrap gap-4 text-sm'>
            <Link href='/privacy-policy' className='text-primary hover:underline'>Privacy</Link>
            <Link href='/terms-and-conditions' className='text-primary hover:underline'>Terms</Link>
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
