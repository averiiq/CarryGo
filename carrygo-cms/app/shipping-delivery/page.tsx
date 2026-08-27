import Link from 'next/link'

const sections = [
  {
    title: 'Service Scope',
    paragraphs: [
      'CarryGo coordinates peer-to-peer parcel movement through verified travellers and route matching.',
      'Actual transport timelines may vary based on route availability, weather, travel constraints, and compliance checks.',
    ],
  },
  {
    title: 'Delivery Timelines',
    paragraphs: [
      'Estimated delivery windows shown in the platform are indicative and not guaranteed unless explicitly committed in writing.',
      'Users are responsible for providing accurate pickup and drop details to avoid delays.',
    ],
  },
  {
    title: 'Packaging and Restricted Items',
    paragraphs: [
      'Senders must package parcels safely and truthfully declare parcel contents, value, and handling requirements.',
      'Illegal, hazardous, or policy-restricted items are prohibited and may lead to cancellation and account suspension.',
    ],
  },
  {
    title: 'Failed or Delayed Delivery',
    paragraphs: [
      'If delivery is delayed or fails, CarryGo support will guide next steps based on tracking history and policy rules.',
      'Compensation, refunds, or disputes are handled according to the Refund & Cancellation Policy.',
    ],
  },
]

export default function ShippingDeliveryPage() {
  return (
    <div className='min-h-screen bg-background px-6 py-12'>
      <main className='max-w-4xl mx-auto space-y-8'>
        <header className='space-y-3'>
          <p className='text-sm text-primary font-semibold'>Legal</p>
          <h1 className='text-3xl font-heading font-bold'>Shipping & Delivery Policy</h1>
          <p className='text-muted'>Last updated: August 27, 2026</p>
          <div className='flex flex-wrap gap-4 text-sm'>
            <Link href='/privacy-policy' className='text-primary hover:underline'>Privacy</Link>
            <Link href='/terms-and-conditions' className='text-primary hover:underline'>Terms</Link>
            <Link href='/refund-cancellation' className='text-primary hover:underline'>Refunds</Link>
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
