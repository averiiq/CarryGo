import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/utils/admin-guard'
import { getPrivateDocumentSourceUrl } from '@/lib/cdn-url'
import { isValidUuid } from '@/lib/validation'

const DOCUMENT_TYPES = new Set(['id_front', 'id_back', 'selfie', 'address_proof'])

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 403 })

  const { id } = await params
  const documentType = request.nextUrl.searchParams.get('type')
  if (!isValidUuid(id) || !documentType || !DOCUMENT_TYPES.has(documentType)) {
    return NextResponse.json({ error: 'Invalid document request' }, { status: 400 })
  }

  const { data: document, error: documentError } = await auth.supabase
    .from('kyc_documents')
    .select('storage_path, mime_type')
    .eq('session_id', id)
    .eq('document_type', documentType)
    .maybeSingle()

  if (documentError) return NextResponse.json({ error: 'Unable to load document' }, { status: 500 })

  let storagePath = document?.storage_path ?? null
  const mimeType = document?.mime_type ?? null

  if (!storagePath) {
    const fieldByType: Record<string, string> = {
      id_front: 'document_url',
      id_back: 'id_back_url',
      selfie: 'selfie_url',
      address_proof: 'address_proof_url',
    }
    const field = fieldByType[documentType]
    const { data: session, error: sessionError } = await auth.supabase
      .from('kyc_sessions')
      .select(field)
      .eq('id', id)
      .maybeSingle()
    if (sessionError) return NextResponse.json({ error: 'Unable to load document' }, { status: 500 })
    storagePath = (session as Record<string, string | null> | null)?.[field] ?? null
  }

  const sourceUrl = storagePath ? getPrivateDocumentSourceUrl(storagePath) : null
  if (!sourceUrl) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  let upstream: Response
  try {
    upstream = await fetch(sourceUrl, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return NextResponse.json({ error: 'Document fetch timed out' }, { status: 504 })
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Document unavailable' }, { status: 502 })
  }

  const contentType = upstream.headers.get('content-type')
  if (!contentType?.startsWith('image/')) {
    return NextResponse.json({ error: 'Unsupported document type' }, { status: 415 })
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': mimeType?.startsWith('image/') ? mimeType : contentType,
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
