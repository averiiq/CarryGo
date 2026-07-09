import { requireAdmin } from '@/utils/admin-guard'
import { redirect, notFound } from 'next/navigation'
import { isValidUuid } from '@/lib/validation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import DocumentViewer from './DocumentViewer'
import ReviewPanel from './ReviewPanel'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function KycReviewPage({ params }: PageProps) {
  const { id } = await params

  if (!isValidUuid(id)) {
    notFound()
  }

  const auth = await requireAdmin()
  if ('error' in auth) redirect('/login')

  const { supabase } = auth

  // Fetch the KYC session
  const { data: session, error: sessionError } = await supabase
    .from('kyc_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (sessionError || !session) {
    notFound()
  }

  // Fetch all documents for this session
  const { data: documents } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('session_id', id)

  // Fetch user profile
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, created_at')
    .eq('id', session.user_id)
    .single()

  // Fetch review history
  const { data: reviewHistory } = await supabase
    .from('kyc_review_history')
    .select('*')
    .eq('session_id', id)
    .order('created_at', { ascending: false })

  // Generate signed URLs for documents (2 hour expiry)
  const documentTypes = ['id_front', 'id_back', 'selfie', 'address_proof'] as const

  const signedDocuments = await Promise.all(
    documentTypes.map(async (docType) => {
      // First check kyc_documents table
      const doc = documents?.find((d) => d.document_type === docType)
      let url: string | null = null

      if (doc?.storage_path) {
        const { data } = await supabase.storage
          .from('kyc_documents')
          .createSignedUrl(doc.storage_path, 60 * 15)
        url = data?.signedUrl || null
      } else {
        // Fallback to session-level URLs (legacy support)
        const sessionUrlField =
          docType === 'id_front'
            ? 'document_url'
            : docType === 'id_back'
              ? 'id_back_url'
              : docType === 'selfie'
                ? 'selfie_url'
                : 'address_proof_url'

        const storagePath = session[sessionUrlField]
        if (storagePath) {
          const { data } = await supabase.storage
            .from('kyc_documents')
            .createSignedUrl(storagePath, 60 * 15)
          url = data?.signedUrl || null
        }
      }

      return {
        type: docType,
        url,
        label: docType,
      }
    })
  )

  const userName = userProfile?.full_name || session.full_name || 'Unknown User'
  const userEmail = userProfile?.email || 'No email'
  const userSignupDate = userProfile?.created_at
    ? new Date(userProfile.created_at).toLocaleDateString()
    : 'Unknown'
  const submissionDate = new Date(session.created_at).toLocaleDateString()

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/kyc"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to KYC Queue
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-500">Review: {userName}</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KYC Review</h1>
        <p className="text-gray-500 mt-1">
          Reviewing {session.id_type || 'document'} submission for {userName}
        </p>
      </div>

      {/* Two-column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Document Viewer */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <DocumentViewer documents={signedDocuments} />
          </div>
        </div>

        {/* Right: Review Panel */}
        <div className="lg:col-span-5">
          <ReviewPanel
            sessionId={id}
            userName={userName}
            userEmail={userEmail}
            userSignupDate={userSignupDate}
            submissionDate={submissionDate}
            attemptNumber={session.submission_attempt || 1}
            currentStatus={session.status}
            reviewerNotes={session.reviewer_notes}
            reviewHistory={reviewHistory || []}
          />
        </div>
      </div>
    </div>
  )
}
