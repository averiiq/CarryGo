const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? ''

export async function getSignedDocumentUrl(
  storagePath: string,
  _expiresInSeconds = 900
): Promise<string | null> {
  return getPublicDocumentUrl(storagePath)
}

export function getPublicDocumentUrl(storagePath: string): string | null {
  if (!storagePath) return null
  if (storagePath.startsWith('http')) return storagePath
  if (!CLOUDINARY_CLOUD_NAME) return null
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${storagePath}`
}

export function isSignedUrlsEnabled(): boolean {
  return false
}
