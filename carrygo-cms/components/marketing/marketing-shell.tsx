import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

type MarketingShellProps = {
  children: ReactNode
}

export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <div className='relative min-h-screen overflow-x-clip bg-background text-foreground'>
      <div className='mesh-gradient' />
      <div className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'>
        <div className='aurora-bg' />
        <span className='orb orb-1' />
        <span className='orb orb-2' />
        <span className='orb orb-3' />
      </div>
      <SiteHeader />
      <main className='relative z-10 flex-1'>{children}</main>
      <SiteFooter />
    </div>
  )
}
