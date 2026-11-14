'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MarketingShell } from '@/components/marketing/marketing-shell'

type LegalSection = {
  id: string
  title: string
  content: string[]
}

type RelatedLink = {
  label: string
  href: string
}

type LegalPageProps = {
  title: string
  summary: string
  effectiveDate: string
  lastUpdated: string
  sections: LegalSection[]
  relatedLinks: RelatedLink[]
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function LegalPage({ title, summary, effectiveDate, lastUpdated, sections, relatedLinks }: LegalPageProps) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    )

    for (const section of sections) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [sections])

  return (
    <MarketingShell>
      <section className='px-4 sm:px-6 py-12 md:py-16'>
        <div className='mx-auto max-w-5xl'>
          {/* Header Card */}
          <div className='glass-card space-y-4 p-6 md:p-10'>
            <p className='text-sm font-semibold uppercase tracking-[0.2em] text-primary'>Legal</p>
            <h1 className='text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight text-foreground'>{title}</h1>
            <p className='max-w-3xl text-sm sm:text-base leading-relaxed text-muted'>{summary}</p>
            <div className='flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted'>
              <p>Effective date: {effectiveDate}</p>
              <p>Last updated: {lastUpdated}</p>
            </div>
            <div className='flex flex-wrap gap-2 pt-1'>
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className='rounded-full border border-border bg-background px-3.5 py-1.5 text-xs text-muted transition-colors hover:border-primary/40 hover:text-primary'
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Two-column layout: TOC + Content */}
          <div className='mt-6 flex gap-6'>
            {/* Sticky Table of Contents (Desktop) */}
            <aside className='hidden lg:block w-64 shrink-0'>
              <nav className='sticky top-24'>
                <p className='text-xs font-bold uppercase tracking-widest text-foreground/60 mb-3'>Contents</p>
                <ul className='space-y-1 text-xs border-l border-border pl-3'>
                  {sections.map((section, idx) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className={`block py-1 transition-colors leading-snug ${
                          activeId === section.id
                            ? 'text-primary font-semibold border-l-2 border-primary -ml-[13px] pl-[11px]'
                            : 'text-muted hover:text-foreground'
                        }`}
                      >
                        {idx + 1}. {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            {/* Content Sections */}
            <div className='flex-1 min-w-0 space-y-4'>
              {sections.map((section, idx) => (
                <section
                  key={section.id}
                  id={section.id}
                  className='glass-card p-5 sm:p-6 md:p-7 scroll-mt-24'
                >
                  <h2 className='text-lg sm:text-xl font-heading font-semibold text-foreground mb-3'>
                    <span className='text-primary/60 mr-2'>{idx + 1}.</span>
                    {section.title}
                  </h2>
                  <div className='space-y-2.5'>
                    {section.content.map((paragraph, pIdx) => (
                      <p key={pIdx} className='text-sm leading-relaxed text-muted'>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
