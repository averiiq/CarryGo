import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { frequentlyAskedQuestions } from '@/components/marketing/site-data'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata('Frequently Asked Questions', 'Answers about CarryGo delivery, payments, safety, and traveler matching.', '/faq')

export default function FaqPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <PageHero
          badge='FAQ'
          title='Answers to Common CarryGo Questions'
          description='Everything you need to understand delivery flow, pricing behavior, safety, and support processes.'
          illustrationSrc='/images/custom/support-center.svg'
          illustrationAlt='Custom support center illustration'
          illustrationLabel='Answers for senders and travelers'
          actions={[
            { label: 'Contact Support', href: '/contact' },
            { label: 'Read Policies', href: '/terms-and-conditions', variant: 'secondary' },
          ]}
        />

        <div className='mx-auto mt-12 w-full max-w-4xl space-y-4'>
          {frequentlyAskedQuestions.map((item) => (
            <details key={item.question} className='glass-card p-6'>
              <summary className='cursor-pointer list-none text-left text-base font-semibold text-foreground'>
                {item.question}
              </summary>
              <p className='mt-3 text-sm leading-relaxed text-muted'>{item.answer}</p>
            </details>
          ))}
        </div>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}







