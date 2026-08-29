import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { publicNavLinks } from '@/components/marketing/site-data'

export function SiteHeader() {
  return (
    <header className='sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-2xl'>
      <div className='mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4'>
        <Link href='/' className='group inline-flex items-center gap-2'>
          <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-subtle to-accent-subtle text-primary transition-transform duration-300 group-hover:scale-105'>
            <ShieldCheck className='h-4 w-4' />
          </div>
          <div className='text-lg font-heading font-bold tracking-tight text-foreground'>
            <span className='premium-text-gradient'>CarryGo</span><span className='text-primary'>.</span>
          </div>
        </Link>

        <nav className='hidden items-center gap-1 lg:flex'>
          {publicNavLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='rounded-xl px-3 py-2 text-sm font-medium text-muted transition-all hover:bg-surface hover:text-foreground'
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href='/contact'
          className='premium-cta-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md'
        >
          Get Started
          <ArrowRight className='h-4 w-4' />
        </Link>
      </div>

      <div className='border-t border-border/70 px-6 py-2 lg:hidden'>
        <div className='mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto pb-1'>
          {publicNavLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:text-primary'
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}

