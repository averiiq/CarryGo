import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import UsersTable from './UsersTable'
import Pagination from '@/components/Pagination'

const PAGE_SIZE = 100

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: usersData, count, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, system_role, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`Unable to load users: ${error.message}`)

  const mappedUsers = usersData?.map(user => ({
    id: user.id,
    name: user.full_name || 'Unknown User',
    email: user.email || 'No email',
    role: user.system_role,
    status: user.status || 'active',
    joined: new Date(user.created_at).toLocaleDateString()
  })) || []

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <UsersTable initialUsers={mappedUsers} />
      <Pagination page={page} totalPages={totalPages} totalItems={count ?? 0} pageSize={PAGE_SIZE} itemLabel="users" />
    </div>
  )
}
