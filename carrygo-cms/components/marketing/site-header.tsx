import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { publicNavLinks } from '@/components/marketing/site-data'

export function SiteHeader() {
  return (
    <header className='sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl'>
      <div className='mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4'>
        <Link href='/' className='group inline-flex items-center gap-2'>
          <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary-subtle text-primary'>
            <ShieldCheck className='h-4 w-4' />
          </div>
          <div className='text-lg font-heading font-bold tracking-tight text-foreground'>
            CarryGo<span className='text-primary'>.</span>
          </div>
        </Link>

        <nav className='hidden items-center gap-1 lg:flex'>
          {publicNavLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground'
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href='/login'
          className='inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary-hover hover:shadow-md'
        >
          Admin Login
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
