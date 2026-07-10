-- Expand KYC schema for multi-document submission and admin review workflow

-- Add new columns to kyc_sessions for full review workflow
ALTER TABLE public.kyc_sessions
  ADD COLUMN IF NOT EXISTS selfie_url text,
  ADD COLUMN IF NOT EXISTS address_proof_url text,
  ADD COLUMN IF NOT EXISTS id_back_url text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewer_notes text,
  ADD COLUMN IF NOT EXISTS submission_attempt integer NOT NULL DEFAULT 1;

-- Create kyc_documents table for per-document tracking
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.kyc_sessions(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('id_front', 'id_back', 'selfie', 'address_proof')),
  storage_path text NOT NULL,
  file_size_bytes integer,
  mime_type text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kyc_documents_unique_type UNIQUE (session_id, document_type)
);

-- Review audit history
CREATE TABLE IF NOT EXISTS public.kyc_review_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.kyc_sessions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_resubmission', 'note_added')),
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS kyc_sessions_status_idx ON public.kyc_sessions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS kyc_sessions_user_idx ON public.kyc_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kyc_documents_session_idx ON public.kyc_documents (session_id);
CREATE INDEX IF NOT EXISTS kyc_review_history_session_idx ON public.kyc_review_history (session_id, created_at DESC);

-- RLS for kyc_documents
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_documents_select_own" ON public.kyc_documents;
CREATE POLICY "kyc_documents_select_own" ON public.kyc_documents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.kyc_sessions s
    WHERE s.id = kyc_documents.session_id AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "kyc_documents_insert_own" ON public.kyc_documents;
CREATE POLICY "kyc_documents_insert_own" ON public.kyc_documents
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.kyc_sessions s
    WHERE s.id = kyc_documents.session_id AND s.user_id = auth.uid()
  ));

-- RLS for kyc_review_history (admin-only read via service role, no client access)
ALTER TABLE public.kyc_review_history ENABLE ROW LEVEL SECURITY;

-- Storage bucket policy helper: users upload to their own path
-- Usage: kyc_documents/{user_id}/{session_id}/{document_type}.jpg
-- Note: Bucket creation and policies must be done via Supabase Dashboard or separate migration
