import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import UsersTable from './UsersTable'
import Pagination from '@/components/Pagination'
import { parsePositiveInt } from '@/lib/validation'

const PAGE_SIZE = 50

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; role?: string; kyc?: string }>
}) {
  const auth = await requireAdmin()
  if ('error' in auth) redirect(auth.error === 'Authentication required' ? '/login' : '/unauthorized')
  const supabase = auth.supabase

  const params = await searchParams
  const page = parsePositiveInt(params.page, 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('user_profiles')
    .select(
      'id, full_name, username, email, phone, role, system_role, status, kyc_status, verified, rating, total_deliveries, total_trips, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (params.status && ['active', 'banned'].includes(params.status)) {
    query = query.eq('status', params.status)
  }

  if (params.role && ['user', 'support_agent', 'admin'].includes(params.role)) {
    query = query.eq('system_role', params.role)
  }

  if (params.kyc && ['approved', 'submitted', 'under_review', 'pending', 'rejected'].includes(params.kyc)) {
    query = query.eq('kyc_status', params.kyc)
  }

  const { data: usersData, count, error } = await query.range(from, to)

  if (error) throw new Error(`Unable to load users: ${error.message}`)

  const mappedUsers =
    usersData?.map((user) => ({
      id: user.id,
      name: user.full_name || user.username || 'Unknown User',
      username: user.username || null,
      email: user.email || 'No email',
      phone: user.phone || null,
      role: user.system_role || 'user',
      marketplaceRole: user.role || 'both',
      status: user.status || 'active',
      kycStatus: user.kyc_status || 'pending',
      verified: Boolean(user.verified),
      rating: user.rating ? Number(user.rating) : 4.5,
      totalDeliveries: user.total_deliveries ? Number(user.total_deliveries) : 0,
      totalTrips: user.total_trips ? Number(user.total_trips) : 0,
      joined: new Date(user.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    })) || []

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">User Moderation & Access</h1>
        <p className="text-sm text-muted mt-1">
          Inspect user accounts, verify identity statuses, assign support roles, and enforce moderation.
        </p>
      </div>

      <UsersTable initialUsers={mappedUsers} totalCount={count ?? 0} />
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={count ?? 0}
        pageSize={PAGE_SIZE}
        itemLabel="users"
      />
    </div>
  )
}
