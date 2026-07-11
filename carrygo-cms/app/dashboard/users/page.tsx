import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import UsersTable from './UsersTable'

const PAGE_SIZE = 100

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: usersData, count } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, system_role, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

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
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted">
            Showing {from + 1}–{Math.min(to + 1, count || 0)} of {count} users
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={`?page=${page - 1}`} className="px-4 py-2 text-sm rounded-xl bg-surface border border-border text-foreground hover:bg-slate-50 transition-colors font-medium">Previous</a>
            )}
            {page < totalPages && (
              <a href={`?page=${page + 1}`} className="px-4 py-2 text-sm rounded-xl bg-surface border border-border text-foreground hover:bg-slate-50 transition-colors font-medium">Next</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
