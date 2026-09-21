import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

type MarketingShellProps = {
  children: ReactNode
}

export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <div className='marketing-theme relative min-h-screen overflow-x-clip bg-background text-foreground'>
      <SiteHeader />
      <main className='relative z-10 flex-1'>{children}</main>
      <SiteFooter />
    </div>
  )
}
