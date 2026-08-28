import Link from 'next/link'
import { footerSections } from '@/components/marketing/site-data'

export function SiteFooter() {
  return (
    <footer className='border-t border-border bg-surface/70 px-6 py-14 backdrop-blur-md'>
      <div className='mx-auto grid w-full max-w-7xl gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]'>
        <div className='space-y-4'>
          <div className='text-2xl font-heading font-bold tracking-tight'>
            CarryGo<span className='text-primary'>.</span>
          </div>
          <p className='max-w-sm text-sm leading-relaxed text-muted'>
            Trusted parcel movement powered by verified travelers, intelligent matching, and secure delivery workflows.
          </p>
          <p className='text-sm font-medium text-foreground'>support@carrygo.in</p>
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

      <div className='mx-auto mt-10 flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted'>
        <p>&copy; 2026 CarryGo Technologies. All rights reserved.</p>
        <p>Built for secure, route-optimized peer delivery.</p>
      </div>
    </footer>
  )
}
