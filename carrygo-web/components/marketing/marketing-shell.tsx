import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'
import { AppTabBar } from '@/components/navigation/app-tab-bar'

type MarketingShellProps = {
  children: ReactNode
}

export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <div className='marketing-theme relative min-h-screen overflow-x-clip bg-background text-foreground flex flex-col'>
      <SiteHeader />
      <main className='relative z-10 flex-1 pb-16 md:pb-0'>{children}</main>
      <SiteFooter />
      <AppTabBar />
    </div>
  )
}
