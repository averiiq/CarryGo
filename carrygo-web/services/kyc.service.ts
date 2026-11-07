/**
 * KYC service (web) — ports the public surface of `CarryGo/services/kyc.service.ts`
 * so the Sandbox UIDAI Aadhaar + PAN + selfie flow behaves identically on web.
 *
 * All state transitions happen server-side via security-definer RPCs; the
 * client never sets `kyc_status='approved'` or `is_verified=true` itself.
 */

import { createClient } from '@/utils/supabase/client'
import { hashAadhaarNumber, hashPanNumber } from '@/lib/crypto'
import { uploadBlobToCloudinary } from '@/services/storage.service'

export type ServiceResult<T> = { data: T; error: null } | { data: null; error: string }

export interface AadhaarAddress {
  fullAddress: string
  house?: string
  street?: string
  locality?: string
  city?: string
  state?: string
  pincode?: string
}

export interface AadhaarVerifiedData {
  referenceId: string
  name: string
  aadhaarNumberMasked?: string
  dob?: string
  gender?: string
  address?: AadhaarAddress
  verifiedAt: string
}

export interface KycSessionSnapshot {
  id: string
  userId: string
  fullName: string
  idType: string
  status: 'pending' | 'submitted' | 'approved' | 'rejected'
  rejectionReason?: string | null
  aadhaarStatus?: string | null
  aadhaarReferenceId?: string | null
  aadhaarName?: string | null
  aadhaarDob?: string | null
  aadhaarGender?: string | null
  selfieStatus?: string | null
  panStatus?: string | null
  kycFlowVersion?: number | null
  createdAt: string
}

function extractLast2MobileDigits(message?: string, mobileNumber?: string): string | undefined {
  if (mobileNumber) {
    const clean = String(mobileNumber).replace(/\D/g, '')
    if (clean.length >= 2) return clean.slice(-2)
  }
  if (!message) return undefined
  const endingMatch = message.match(/ending\s+(?:in|with)\s+[^0-9]*(\d{2,4})/i)
  if (endingMatch) return endingMatch[1].slice(-2)
  const maskedMatch = message.match(/[Xx*•-]{2,}(\d{2,4})/)
  if (maskedMatch) return maskedMatch[1].slice(-2)
  return undefined
}

export async function fetchLatestKycSession(
  userId: string,
): Promise<ServiceResult<KycSessionSnapshot | null>> {
  const sb = createClient()
  const { data, error } = await sb
    .from('kyc_sessions')
    .select(
      'id, user_id, full_name, id_type, status, rejection_reason, aadhaar_verification_status, aadhaar_reference_id, aadhaar_name, aadhaar_dob, aadhaar_gender, selfie_status, pan_verification_status, kyc_flow_version, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  if (!data) return { data: null, error: null }

  return {
    data: {
      id: data.id,
      userId: data.user_id,
      fullName: data.full_name,
      idType: data.id_type,
      status: data.status,
      rejectionReason: data.rejection_reason,
      aadhaarStatus: data.aadhaar_verification_status,
      aadhaarReferenceId: data.aadhaar_reference_id,
      aadhaarName: data.aadhaar_name,
      aadhaarDob: data.aadhaar_dob,
      aadhaarGender: data.aadhaar_gender,
      selfieStatus: data.selfie_status,
      panStatus: data.pan_verification_status,
      kycFlowVersion: data.kyc_flow_version,
      createdAt: data.created_at,
    },
    error: null,
  }
}

export async function generateAadhaarOtp(
  userId: string,
  fullName: string,
  aadhaarNumber: string,
): Promise<
  ServiceResult<{
    sessionId: string
    referenceId: string
    maskedAadhaar: string
    registeredMobileEnding?: string
  }>
> {
  const cleanAadhaar = aadhaarNumber.replace(/\D/g, '')
  if (cleanAadhaar.length !== 12) {
    return { data: null, error: 'Please enter a valid 12-digit Aadhaar number.' }
  }

  const sb = createClient()
  const aadhaarHash = await hashAadhaarNumber(cleanAadhaar)

  const { data: duplicate } = await sb
    .from('kyc_sessions')
    .select('id, user_id')
    .eq('aadhaar_hash', aadhaarHash)
    .neq('user_id', userId)
    .in('status', ['submitted', 'approved'])
    .limit(1)
    .maybeSingle()

  if (duplicate) {
    return {
      data: null,
      error:
        'This Aadhaar number is already linked to another CaryGoo account. Each individual may only operate one account.',
    }
  }

  const maskedAadhaar = `•••• •••• ${cleanAadhaar.slice(-4)}`

  const { data: edgeData, error: edgeErr } = await sb.functions.invoke('sandbox-kyc', {
    body: { action: 'generate_otp', aadhaarNumber: cleanAadhaar },
  })

  if (edgeErr) {
    return {
      data: null,
      error:
        edgeErr.message ||
        'UIDAI gateway request failed. Please verify your 12-digit number and retry.',
    }
  }

  const res = edgeData as {
    data?: { reference_id?: string | number; message?: string; mobile_number?: string }
    reference_id?: string | number
    message?: string
    mobile_number?: string
    code?: number
    error?: string
  }

  if (res?.error) return { data: null, error: res.error }
  if (res?.code && res.code !== 200) {
    return { data: null, error: res.data?.message || res.message || `UIDAI returned code ${res.code}.` }
  }

  const rawRef = res.data?.reference_id ?? res.reference_id
  if (!rawRef) {
    return {
      data: null,
      error:
        res.data?.message ||
        res.message ||
        'UIDAI did not dispatch a new OTP. Your existing OTP remains valid for 10 minutes.',
    }
  }

  const referenceId = String(rawRef)
  const registeredMobileEnding = extractLast2MobileDigits(
    res.data?.message ?? res.message,
    res.data?.mobile_number ?? res.mobile_number,
  )

  const { data: existing } = await sb
    .from('kyc_sessions')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'submitted'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error: updErr } = await sb
      .from('kyc_sessions')
      .update({
        aadhaar_verification_status: 'pending',
        aadhaar_reference_id: referenceId,
        provider_session_id: referenceId,
        aadhaar_hash: aadhaarHash,
        kyc_flow_version: 2,
        provider: 'sandbox',
      })
      .eq('id', existing.id)
    if (updErr) return { data: null, error: updErr.message }
    return {
      data: { sessionId: existing.id, referenceId, maskedAadhaar, registeredMobileEnding },
      error: null,
    }
  }

  const { data: inserted, error: insErr } = await sb
    .from('kyc_sessions')
    .insert({
      user_id: userId,
      full_name: fullName,
      id_type: 'aadhaar',
      provider: 'sandbox',
      provider_session_id: referenceId,
      aadhaar_verification_status: 'pending',
      aadhaar_reference_id: referenceId,
      aadhaar_hash: aadhaarHash,
      kyc_flow_version: 2,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insErr || !inserted) {
    return { data: null, error: insErr?.message ?? 'Failed to initialize verification session.' }
  }

  return {
    data: { sessionId: inserted.id, referenceId, maskedAadhaar, registeredMobileEnding },
    error: null,
  }
}

export async function verifyAadhaarOtp(
  sessionId: string,
  userId: string,
  referenceId: string,
  otp: string,
  maskedAadhaar?: string,
  aadhaarNumber?: string,
): Promise<ServiceResult<AadhaarVerifiedData>> {
  const cleanOtp = otp.trim().replace(/\D/g, '')
  if (cleanOtp.length !== 6) {
    return { data: null, error: 'Please enter the 6-digit OTP sent to your Aadhaar-linked mobile.' }
  }

  const sb = createClient()

  const { data: edgeData, error: edgeErr } = await sb.functions.invoke('sandbox-kyc', {
    body: { action: 'verify_otp', referenceId, otp: cleanOtp },
  })

  if (edgeErr) {
    return {
      data: null,
      error: edgeErr.message || 'Aadhaar OTP verification failed. Please check the code.',
    }
  }

  const res = edgeData as {
    data?: {
      name?: string
      date_of_birth?: string
      gender?: string
      full_address?: string
      address?: {
        house?: string
        street?: string
        locality?: string
        district?: string
        state?: string
        pincode?: string
      }
      message?: string
    }
    message?: string
    error?: string
  }

  if (res?.error) return { data: null, error: res.error }
  if (!res.data?.name) {
    const msg = res.data?.message ?? res.message
    if (msg && msg.toLowerCase().includes('expired')) {
      return { data: null, error: 'Your OTP has expired. Please request a new OTP to continue.' }
    }
    return { data: null, error: msg ?? 'Invalid or expired OTP. Please try again.' }
  }

  const verified: AadhaarVerifiedData = {
    referenceId,
    name: res.data.name,
    aadhaarNumberMasked: maskedAadhaar ?? '•••• •••• ••••',
    dob: res.data.date_of_birth,
    gender:
      res.data.gender === 'M'
        ? 'Male'
        : res.data.gender === 'F'
          ? 'Female'
          : res.data.gender,
    address: {
      fullAddress: res.data.full_address ?? '',
      house: res.data.address?.house,
      street: res.data.address?.street,
      locality: res.data.address?.locality,
      city: res.data.address?.district,
      state: res.data.address?.state,
      pincode: res.data.address?.pincode,
    },
    verifiedAt: new Date().toISOString(),
  }

  const aadhaarHash = aadhaarNumber ? await hashAadhaarNumber(aadhaarNumber) : undefined

  const { error: rpcErr } = await sb.rpc('verify_aadhaar_sandbox', {
    p_session_id: sessionId,
    p_user_id: userId,
    p_reference_id: referenceId,
    p_name: verified.name,
    p_dob: verified.dob,
    p_gender: verified.gender,
    p_address: verified.address
      ? {
          full_address: verified.address.fullAddress,
          house: verified.address.house,
          street: verified.address.street,
          locality: verified.address.locality,
          city: verified.address.city,
          state: verified.address.state,
          pincode: verified.address.pincode,
        }
      : undefined,
    p_aadhaar_hash: aadhaarHash,
  })

  if (rpcErr) return { data: null, error: rpcErr.message }

  return { data: verified, error: null }
}

export async function uploadSelfie(
  sessionId: string,
  userId: string,
  selfieBlob: Blob,
): Promise<ServiceResult<{ cdnUrl: string }>> {
  if (!selfieBlob || selfieBlob.size === 0) {
    return { data: null, error: 'Selfie image is empty. Please recapture your photo.' }
  }
  if (selfieBlob.size > 15 * 1024 * 1024) {
    return { data: null, error: 'Selfie is too large (max 15 MB).' }
  }

  let cdnUrl: string
  let key: string
  let sizeBytes = selfieBlob.size
  let mimeType = selfieBlob.type || 'image/jpeg'

  try {
    const result = await uploadBlobToCloudinary(
      selfieBlob,
      'kyc-documents',
      userId,
      `${sessionId}_selfie`,
    )
    cdnUrl = result.cdnUrl
    key = result.publicId
    sizeBytes = result.sizeBytes
    mimeType = result.mimeType
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Selfie upload failed. Please retry.',
    }
  }

  const sb = createClient()

  const { error: rpcErr } = await sb.rpc('register_kyc_selfie', {
    p_session_id: sessionId,
    p_user_id: userId,
    p_selfie_url: cdnUrl,
  })

  if (rpcErr) return { data: null, error: rpcErr.message }

  await sb.from('kyc_documents').upsert(
    {
      session_id: sessionId,
      document_type: 'selfie',
      storage_path: key,
      file_size_bytes: sizeBytes,
      mime_type: mimeType,
    },
    { onConflict: 'session_id,document_type' },
  )

  return { data: { cdnUrl }, error: null }
}

export async function verifyPan(
  sessionId: string,
  userId: string,
  panNumber: string,
): Promise<ServiceResult<{ verified: boolean }>> {
  const cleanPan = panNumber.trim().toUpperCase()
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  if (!panRegex.test(cleanPan)) {
    return { data: null, error: 'Please enter a valid 10-character PAN number (e.g. ABCDE1234F).' }
  }

  const sb = createClient()
  const panHash = await hashPanNumber(cleanPan)

  const { data: duplicate } = await sb
    .from('kyc_sessions')
    .select('id, user_id')
    .eq('pan_hash', panHash)
    .neq('user_id', userId)
    .in('status', ['submitted', 'approved'])
    .limit(1)
    .maybeSingle()

  if (duplicate) {
    return { data: null, error: 'This PAN card is already linked to another CaryGoo account.' }
  }

  const panRefId = `pan_${cleanPan.slice(0, 1)}XXXXX${cleanPan.slice(-4)}_${Date.now()}`

  const { error: rpcErr } = await sb.rpc('update_kyc_pan_status', {
    p_session_id: sessionId,
    p_user_id: userId,
    p_pan_status: 'verified',
    p_pan_reference_id: panRefId,
    p_pan_hash: panHash,
  })

  if (rpcErr) return { data: null, error: rpcErr.message }

  return { data: { verified: true }, error: null }
}

export async function skipPan(
  sessionId: string,
  userId: string,
): Promise<ServiceResult<{ skipped: boolean }>> {
  const sb = createClient()
  const { error } = await sb.rpc('update_kyc_pan_status', {
    p_session_id: sessionId,
    p_user_id: userId,
    p_pan_status: 'not_provided',
  })
  if (error) return { data: null, error: error.message }
  return { data: { skipped: true }, error: null }
}

export async function submitSandboxKyc(
  sessionId: string,
  userId: string,
  faceResult?: {
    isValid: boolean
    confidence: number
    faceCount: number
    isCentered: boolean
    lightingQuality: string
  },
): Promise<ServiceResult<{ success: boolean }>> {
  const sb = createClient()
  const { error } = await sb.rpc('submit_sandbox_kyc', {
    p_session_id: sessionId,
    p_user_id: userId,
    p_face_verified: faceResult?.isValid ?? true,
    p_face_confidence: faceResult?.confidence ?? null,
    p_face_metrics: faceResult
      ? {
          faceCount: faceResult.faceCount,
          isCentered: faceResult.isCentered,
          lightingQuality: faceResult.lightingQuality,
        }
      : null,
  })
  if (error) return { data: null, error: error.message }
  return { data: { success: true }, error: null }
}

/**
 * Converts a canvas dataURL (`data:image/jpeg;base64,...`) into a Blob
 * so the browser `File`/multipart upload path can send it directly.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = header.match(/data:([^;]+);base64/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const binary = atob(base64)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return new Blob([buf], { type: mime })
}
