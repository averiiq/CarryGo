const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export async function getSignedDocumentUrl(
  storagePath: string,
  _expiresInSeconds = 900
): Promise<string | null> {
  void _expiresInSeconds
  return getPublicDocumentUrl(storagePath)
}

export function getPublicDocumentUrl(storagePath: string): string | null {
  if (!storagePath) return null

  if (storagePath.startsWith('http')) return storagePath

  if (CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${storagePath}`
  }

  if (SUPABASE_URL) {
    const cleanPath = storagePath.startsWith('/') ? storagePath.slice(1) : storagePath
    return `${SUPABASE_URL}/storage/v1/object/public/${cleanPath}`
  }

  return null
}

export function isSignedUrlsEnabled(): boolean {
  return false
}
