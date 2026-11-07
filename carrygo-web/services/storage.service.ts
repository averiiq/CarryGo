/**
 * Storage service (web) — generic Cloudinary upload helper using the
 * `generate-upload-url` edge function (the same server-signed path mobile
 * uses). Used by KYC selfies, avatars, parcel photos, chat attachments.
 */

import { createClient } from '@/utils/supabase/client'

export type StorageFolder = 'avatars' | 'parcels' | 'kyc-documents' | 'delivery-proofs' | 'chat-attachments'

export interface UploadResult {
  cdnUrl: string
  publicId: string
  sizeBytes: number
  mimeType: string
}

interface CloudinarySignature {
  signature: string
  timestamp: number
  apiKey: string
  publicId: string
}

async function getCloudinarySignature(
  folder: StorageFolder,
  publicId: string,
): Promise<CloudinarySignature> {
  const sb = createClient()
  const { data: sessionData } = await sb.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Authentication required for upload.')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) throw new Error('Supabase not configured.')

  const resp = await fetch(`${supabaseUrl}/functions/v1/generate-upload-url`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ folder, publicId }),
  })

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: 'Upload authorization failed' }))
    throw new Error(body.error || `Upload authorization failed (${resp.status})`)
  }
  return resp.json()
}

export async function uploadBlobToCloudinary(
  blob: Blob,
  folder: StorageFolder,
  userId: string,
  fileName: string,
): Promise<UploadResult> {
  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME
  if (!cloudName) throw new Error('Cloudinary cloud name not configured.')

  if (!blob || blob.size === 0) throw new Error('File is empty.')
  if (blob.size > 15 * 1024 * 1024) throw new Error('File is too large (max 15 MB).')

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 200)
  const publicId = `${folder}/${userId}/${date}/${safeName}`

  const sig = await getCloudinarySignature(folder, publicId)

  const form = new FormData()
  form.append('file', blob, `${safeName}.jpg`)
  form.append('api_key', sig.apiKey)
  form.append('timestamp', String(sig.timestamp))
  form.append('signature', sig.signature)
  form.append('public_id', sig.publicId)

  const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  })

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`Cloudinary upload failed (${resp.status}): ${txt.slice(0, 200)}`)
  }

  const data = (await resp.json()) as { secure_url?: string; public_id?: string; bytes?: number }
  if (!data.secure_url || !data.public_id) throw new Error('Unexpected upload response.')

  return {
    cdnUrl: data.secure_url,
    publicId: data.public_id,
    sizeBytes: data.bytes ?? blob.size,
    mimeType: blob.type || 'image/jpeg',
  }
}

export function fileToBlob(file: File): Blob {
  return file.slice(0, file.size, file.type || 'image/jpeg')
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = header.match(/data:([^;]+);base64/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const binary = atob(base64)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return new Blob([buf], { type: mime })
}
