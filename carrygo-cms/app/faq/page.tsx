import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { frequentlyAskedQuestions } from '@/components/marketing/site-data'

export default function FaqPage() {
  return (
    <MarketingShell>
      <section className='px-6 py-16 md:py-20'>
        <PageHero
          badge='FAQ'
          title='Answers to Common CarryGo Questions'
          description='Everything you need to understand delivery flow, pricing behavior, safety, and support processes.'
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
      </section>
    </MarketingShell>
  )
}
