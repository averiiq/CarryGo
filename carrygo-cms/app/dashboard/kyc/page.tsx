import { requireAdmin } from '@/utils/admin-guard'
import { redirect } from 'next/navigation'
import KycQueue from './KycQueue'

export default async function KYCPage() {
  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')
  const supabase = auth.supabase

  // Fetch all KYC sessions with document counts
  const { data: sessions } = await supabase
    .from('kyc_sessions')
    .select('id, user_id, full_name, id_type, status, submission_attempt, created_at')
    .order('created_at', { ascending: false })

  // Fetch document counts per session
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

  // Map sessions to the format expected by KycQueue
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

  // Compute counts per status
  const counts = {
    all: mappedSessions.length,
    submitted: mappedSessions.filter((s) => s.status === 'submitted').length,
    under_review: mappedSessions.filter((s) => s.status === 'under_review').length,
    approved: mappedSessions.filter((s) => s.status === 'approved').length,
    rejected: mappedSessions.filter((s) => s.status === 'rejected').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
        <p className="text-gray-500">
          Review and manage identity verification submissions.
        </p>
      </div>

      <KycQueue sessions={mappedSessions} counts={counts} activeTab="submitted" />
    </div>
  )
}
