import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { publicNavLinks } from '@/components/marketing/site-data'

export function SiteHeader() {
  return (
    <header className='sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md'>
      <div className='site-header-inner mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4'>
        <Link href='/' className='inline-flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary-subtle text-primary sm:h-9 sm:w-9'>
            <ShieldCheck className='h-4 w-4' />
          </div>
          <div className='text-base font-heading font-bold tracking-tight text-foreground sm:text-lg'>
            CarryGo<span className='text-primary'>.</span>
          </div>
        </Link>

        <nav className='hidden items-center gap-1 lg:flex'>
          {publicNavLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-primary-subtle hover:text-foreground'
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href='/contact'
          className='site-top-cta button-primary rounded-xl px-3 py-2.5 sm:px-4'
        >
          <span className='hidden sm:inline'>Get Started</span>
          <span className='sm:hidden'>Start</span>
          <ArrowRight className='hidden h-4 w-4 sm:block' />
        </Link>
      </div>

      <div className='border-t border-border/70 px-4 py-2 sm:px-6 lg:hidden'>
        <div className='mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto pb-1'>
          {publicNavLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='whitespace-nowrap rounded-full border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-primary/40 hover:bg-primary-subtle hover:text-primary sm:px-3 sm:text-xs'
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}
