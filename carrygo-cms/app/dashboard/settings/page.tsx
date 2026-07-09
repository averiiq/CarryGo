import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import { User, Mail, Shield, Key } from 'lucide-react'

export default async function SettingsPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-500">Manage your administrative profile and portal preferences.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Profile Header */}
        <div className="px-8 py-8 border-b border-gray-100 flex items-center space-x-6">
          <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold">
            {profile?.full_name?.charAt(0) || 'A'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{profile?.full_name || 'System Administrator'}</h2>
            <p className="text-gray-500 flex items-center mt-1">
              <Shield className="w-4 h-4 mr-1 text-blue-500" /> 
              {profile?.system_role === 'admin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
        </div>

        {/* Settings Form */}
        <div className="p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-100 pb-8">
            <div className="col-span-1">
              <h3 className="text-lg font-medium text-gray-900">Account Details</h3>
              <p className="text-sm text-gray-500 mt-1">Your basic administrative information.</p>
            </div>
            <div className="col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    disabled
                    value={profile?.full_name || 'System Administrator'}
                    className="flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 bg-gray-50 text-gray-500 py-2 px-3"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ''}
                    className="flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 bg-gray-50 text-gray-500 py-2 px-3"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1">
              <h3 className="text-lg font-medium text-gray-900">Security</h3>
              <p className="text-sm text-gray-500 mt-1">Manage your password and security settings.</p>
            </div>
            <div className="col-span-2 space-y-4">
              <button disabled className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors">
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </button>
              <p className="text-xs text-gray-400 mt-2">Password management is handled via the mobile app for now.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
