import Image from 'next/image'
import Link from 'next/link'
import { footerSections } from '@/components/marketing/site-data'

export function SiteFooter() {
  return (
    <footer className='border-t border-border bg-surface/75 px-4 py-12 sm:px-6 sm:py-16'>
      <div className='mx-auto grid w-full max-w-7xl gap-8 sm:gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]'>
        <div className='space-y-4 sm:col-span-2 lg:col-span-1'>
          <div className='text-2xl font-heading font-bold tracking-tight'>
            CarryGo<span className='text-primary'>.</span>
          </div>
          <p className='max-w-sm text-sm leading-relaxed text-muted'>
            Trusted parcel movement powered by verified travelers, intelligent matching, and secure delivery workflows.
          </p>
          <p className='text-sm font-medium text-foreground'>support@carrygo.in</p>
          <div className='glass-card relative mt-4 max-w-[240px] overflow-hidden rounded-2xl p-2'>
            <Image
              src="/images/abstract/hero-routes.jpg"
              alt="CarryGo interconnected route network"
              width={320}
              height={200}
              className="aspect-[16/10] w-full rounded-xl object-cover"
            />
          </div>
        </div>

        {footerSections.map((section) => (
          <div key={section.title} className='space-y-3'>
            <h3 className='text-sm font-semibold uppercase tracking-wide text-foreground/80'>{section.title}</h3>
            <ul className='space-y-2'>
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className='inline-link text-sm font-medium text-muted hover:text-primary'>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className='site-footer-bottom mx-auto mt-10 flex w-full max-w-7xl flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-border pt-5 text-xs text-muted sm:mt-12 sm:pt-6 sm:text-sm text-center sm:text-left'>
        <p>&copy; 2026 CarryGo Technologies. All rights reserved.</p>
        <p>Custom in-house visuals by CarryGo design system.</p>
      </div>
    </footer>
  )
}
