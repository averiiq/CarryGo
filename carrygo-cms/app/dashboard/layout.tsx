import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export const dynamic = 'force-dynamic'

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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
