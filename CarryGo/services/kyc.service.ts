import { getSupabaseClient } from '@/template';
import { KycDocumentType, KycIdType, KycSession, KycDocument } from '@/types';
import { uploadKycDocument as uploadKycToS3 } from '@/services/storage.service';

interface KycDocumentRow {
  id: string;
  session_id: string;
  document_type: string;
  storage_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  uploaded_at: string;
}

interface KycSessionRow {
  id: string;
  user_id: string;
  full_name: string;
  id_type: string;
  status: string;
  rejection_reason: string | null;
  submission_attempt: number;
  created_at: string;
}

function mapDocument(row: KycDocumentRow): KycDocument {
  return {
    id: row.id,
    sessionId: row.session_id,
    documentType: row.document_type as KycDocumentType,
    storagePath: row.storage_path,
    fileSizeBytes: row.file_size_bytes ?? undefined,
    mimeType: row.mime_type ?? undefined,
    uploadedAt: row.uploaded_at,
  };
}

function mapSession(row: KycSessionRow, documents: KycDocument[]): KycSession {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    idType: row.id_type as KycIdType,
    status: row.status as KycSession['status'],
    rejectionReason: row.rejection_reason ?? undefined,
    submissionAttempt: row.submission_attempt,
    documents,
    createdAt: row.created_at,
  };
}

export async function createKycSession(userId: string, fullName: string, idType: KycIdType) {
  const sb = getSupabaseClient();

  const { data: existing } = await sb
    .from('kyc_sessions')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['submitted', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && existing.status === 'submitted') {
    return { data: null, error: 'You already have a submission under review.' };
  }

  if (existing && existing.status === 'pending') {
    return { data: { sessionId: existing.id }, error: null };
  }

  const { data, error } = await sb
    .from('kyc_sessions')
    .insert({ user_id: userId, full_name: fullName, id_type: idType, status: 'pending' })
    .select('id')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: { sessionId: data.id }, error: null };
}

export async function uploadKycDocument(
  sessionId: string,
  userId: string,
  documentType: KycDocumentType,
  fileUri: string
) {
  const sb = getSupabaseClient();

  const { data: uploadData, error: uploadError } = await uploadKycToS3(
    fileUri,
    userId,
    sessionId,
    documentType
  );

  if (uploadError || !uploadData) return { data: null, error: uploadError ?? 'Upload failed' };

  const { error: dbError } = await sb.from('kyc_documents').upsert(
    {
      session_id: sessionId,
      document_type: documentType,
      storage_path: uploadData.key,
      file_size_bytes: uploadData.sizeBytes,
      mime_type: uploadData.mimeType,
    },
    { onConflict: 'session_id,document_type' }
  );

  if (dbError) return { data: null, error: dbError.message };
  return { data: { storagePath: uploadData.key, cdnUrl: uploadData.cdnUrl }, error: null };
}

export async function submitKycSession(sessionId: string, userId: string) {
  const sb = getSupabaseClient();

  const { data: docs } = await sb
    .from('kyc_documents')
    .select('document_type')
    .eq('session_id', sessionId);

  const uploadedTypes = new Set((docs ?? []).map(d => d.document_type));
  const required: KycDocumentType[] = ['id_front', 'id_back', 'selfie', 'address_proof'];
  const missing = required.filter(t => !uploadedTypes.has(t));

  if (missing.length > 0) {
    return { error: `Missing documents: ${missing.join(', ')}` };
  }

  const { error: sessionError } = await sb
    .from('kyc_sessions')
    .update({ status: 'submitted' })
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (sessionError) return { error: sessionError.message };

  const { error: profileError } = await sb
    .from('user_profiles')
    .update({ kyc_status: 'submitted' })
    .eq('id', userId);

  if (profileError) return { error: profileError.message };
  return { error: null };
}

export async function fetchLatestKycSession(userId: string): Promise<{ data: KycSession | null; error: string | null }> {
  const sb = getSupabaseClient();

  const { data: session, error } = await sb
    .from('kyc_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!session) return { data: null, error: null };

  const { data: docs } = await sb
    .from('kyc_documents')
    .select('*')
    .eq('session_id', session.id);

  const documents = (docs ?? []).map(mapDocument);
  return { data: mapSession(session, documents), error: null };
}
