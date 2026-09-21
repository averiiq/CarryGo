import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export const revalidate = 60

export const metadata = {
  title: 'CarryGo Admin CMS',
  description: 'Internal CMS and dashboard for CarryGo',
  robots: { index: false, follow: false },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="mesh-gradient" />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden pl-0 md:pl-[260px]">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-[1400px] animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
