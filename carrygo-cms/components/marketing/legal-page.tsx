import Link from 'next/link'
import { MarketingShell } from '@/components/marketing/marketing-shell'

type LegalSection = {
  title: string
  paragraphs: string[]
}

type RelatedLink = {
  label: string
  href: string
}

type LegalPageProps = {
  title: string
  summary: string
  lastUpdated: string
  sections: LegalSection[]
  relatedLinks: RelatedLink[]
}

export function LegalPage({ title, summary, lastUpdated, sections, relatedLinks }: LegalPageProps) {
  return (
    <MarketingShell>
      <section className='px-6 py-16 md:py-20'>
        <div className='mx-auto max-w-4xl'>
          <div className='glass-card space-y-5 p-7 md:p-10'>
            <p className='text-sm font-semibold uppercase tracking-[0.2em] text-primary'>Legal</p>
            <h1 className='text-3xl font-heading font-bold tracking-tight text-foreground md:text-4xl'>{title}</h1>
            <p className='max-w-3xl text-base leading-relaxed text-muted'>{summary}</p>
            <p className='text-sm text-muted'>Last updated: {lastUpdated}</p>
            <div className='flex flex-wrap gap-2'>
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className='rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted transition-colors hover:border-primary/40 hover:text-primary'
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className='mt-7 space-y-5'>
            {sections.map((section) => (
              <section key={section.title} className='glass-card space-y-3 p-7 md:p-8'>
                <h2 className='text-xl font-heading font-semibold text-foreground'>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className='text-base leading-relaxed text-muted'>
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
