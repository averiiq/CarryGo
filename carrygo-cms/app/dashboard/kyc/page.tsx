import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import KycQueue from './KycQueue'
import Pagination from '@/components/Pagination'
import { parsePositiveInt } from '@/lib/validation'

const PAGE_SIZE = 100

type TabKey = 'all' | 'submitted' | 'under_review' | 'approved' | 'rejected'

export default async function KYCPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) redirect(auth.error === 'Authentication required' ? '/login' : '/unauthorized')
  const supabase = auth.supabase

  const params = await searchParams
  const page = parsePositiveInt(params.page, 1)
  const activeTab: TabKey = ['submitted', 'under_review', 'approved', 'rejected'].includes(params.status || '')
    ? params.status as TabKey
    : 'all'
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let sessionsQuery = supabase
    .from('kyc_sessions')
    .select('id, user_id, full_name, id_type, status, submission_attempt, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (activeTab !== 'all') sessionsQuery = sessionsQuery.eq('status', activeTab)
  const [{ data: sessions, count, error }, ...countResults] = await Promise.all([
    sessionsQuery.range(from, to),
    supabase.from('kyc_sessions').select('*', { count: 'exact', head: true }),
    supabase.from('kyc_sessions').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('kyc_sessions').select('*', { count: 'exact', head: true }).eq('status', 'under_review'),
    supabase.from('kyc_sessions').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('kyc_sessions').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ])

  const queryError = [error, ...countResults.map((result) => result.error)].find(Boolean)
  if (queryError) throw new Error(`Unable to load KYC queue: ${queryError.message}`)

  const sessionIds = (sessions || []).map((s) => s.id)
  let documentCountsMap: Record<string, number> = {}

  if (sessionIds.length > 0) {
    const { data: documents } = await supabase
      .from('kyc_documents')
      .select('session_id')
      .in('session_id', sessionIds)

    if (documents) {
      documentCountsMap = documents.reduce<Record<string, number>>((acc, doc) => {
        acc[doc.session_id] = (acc[doc.session_id] || 0) + 1
        return acc
      }, {})
    }
  }

  const mappedSessions = (sessions || []).map((session) => ({
    id: session.id,
    userId: session.user_id,
    fullName: session.full_name || 'Unknown User',
    idType: session.id_type || 'Unknown',
    documentsCount: documentCountsMap[session.id] || 0,
    submittedAt: session.created_at,
    attemptNumber: session.submission_attempt || 1,
    status: session.status,
  }))

  const counts = {
    all: countResults[0].count ?? 0,
    submitted: countResults[1].count ?? 0,
    under_review: countResults[2].count ?? 0,
    approved: countResults[3].count ?? 0,
    rejected: countResults[4].count ?? 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">KYC Verification</h1>
        <p className="text-sm text-muted mt-1">
          Review and manage identity verification submissions.
        </p>
      </div>

      <KycQueue sessions={mappedSessions} counts={counts} activeTab={activeTab} />
      <Pagination page={page} totalPages={Math.ceil((count ?? 0) / PAGE_SIZE)} totalItems={count ?? 0} pageSize={PAGE_SIZE} itemLabel="submissions" query={activeTab === 'all' ? {} : { status: activeTab }} />
    </div>
  )
}
