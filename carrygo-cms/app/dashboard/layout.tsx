import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export const revalidate = 60

export const metadata = {
  title: 'CarryGo Admin CMS',
  description: 'Internal CMS and dashboard for CarryGo',
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
      <div className="flex flex-1 flex-col overflow-hidden pl-[260px]">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[1400px] animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
