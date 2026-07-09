'use client'

import { LogOut, Bell } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-8">
      <h2 className="text-lg font-semibold text-gray-900">Dashboard Overview</h2>
      
      <div className="flex items-center space-x-4">
        <button className="text-gray-400 hover:text-gray-500">
          <span className="sr-only">View notifications</span>
          <Bell className="h-6 w-6" aria-hidden="true" />
        </button>
        
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
          A
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center text-sm font-medium text-red-600 hover:text-red-700"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </button>
      </div>
    </header>
  )
}
