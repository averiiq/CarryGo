import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import UsersTable from './UsersTable'

export default async function UsersPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  // Fetch all users
  const { data: usersData } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, system_role, status, created_at')
    .order('created_at', { ascending: false })

  // Map to the format expected by the table
  const mappedUsers = usersData?.map(user => ({
    id: user.id,
    name: user.full_name || 'Unknown User',
    email: user.email || 'No email',
    role: user.system_role,
    status: user.status || 'active', // Fallback for old rows
    joined: new Date(user.created_at).toLocaleDateString()
  })) || []

  return (
    <div className="space-y-6">
      <UsersTable initialUsers={mappedUsers} />
    </div>
  )
}
