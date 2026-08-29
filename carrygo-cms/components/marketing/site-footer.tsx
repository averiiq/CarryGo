import Image from 'next/image'
import Link from 'next/link'
import { footerSections } from '@/components/marketing/site-data'

export function SiteFooter() {
  return (
    <footer className='border-t border-border bg-surface/75 px-6 py-16'>
      <div className='mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr]'>
        <div className='space-y-4'>
          <div className='text-2xl font-heading font-bold tracking-tight'>
            CarryGo<span className='text-primary'>.</span>
          </div>
          <p className='max-w-sm text-sm leading-relaxed text-muted'>
            Trusted parcel movement powered by verified travelers, intelligent matching, and secure delivery workflows.
          </p>
          <p className='text-sm font-medium text-foreground'>support@carrygo.in</p>
          <div className='relative mt-4 max-w-[240px] overflow-hidden rounded-2xl border border-border/70 bg-background p-2'>
            <Image
              src='/images/custom/team-collaboration.svg'
              alt='CarryGo team collaboration'
              width={320}
              height={220}
              className='h-auto w-full rounded-xl'
            />
          </div>
        </div>

        {footerSections.map((section) => (
          <div key={section.title} className='space-y-3'>
            <h3 className='text-sm font-semibold uppercase tracking-wide text-foreground/80'>{section.title}</h3>
            <ul className='space-y-2'>
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className='text-sm text-muted transition-colors hover:text-primary'>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className='mx-auto mt-12 flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted'>
        <p>&copy; 2026 CarryGo Technologies. All rights reserved.</p>
        <p>Custom in-house visuals by CarryGo design system.</p>
      </div>
    </footer>
  )
}
