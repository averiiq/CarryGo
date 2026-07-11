import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import BulkOperations from './BulkOperations'

export default async function BulkPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  const { data: unverifiedUsers } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, created_at, kyc_status')
    .eq('kyc_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100)

  const today = new Date().toISOString().split('T')[0]
  const { data: expiredTrips } = await supabase
    .from('trips')
    .select('id, user_name, from_city, to_city, date, status')
    .eq('status', 'active')
    .lt('date', today)
    .order('date', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Bulk Operations</h1>
        <p className="text-sm text-muted mt-1">Perform batch actions on users, trips, and parcels.</p>
      </div>

      <BulkOperations
        unverifiedUsers={(unverifiedUsers ?? []).map(u => ({
          id: u.id,
          name: u.full_name ?? 'Unknown',
          email: u.email ?? '',
          createdAt: u.created_at,
          kycStatus: u.kyc_status ?? 'pending',
        }))}
        expiredTrips={(expiredTrips ?? []).map(t => ({
          id: t.id,
          userName: t.user_name,
          fromCity: t.from_city,
          toCity: t.to_city,
          date: t.date,
          status: t.status,
        }))}
      />
    </div>
  )
}
