const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function configuredHosts(): Set<string> {
  const hosts = new Set<string>()
  if (CLOUDINARY_CLOUD_NAME) hosts.add('res.cloudinary.com')
  if (SUPABASE_URL) {
    try {
      hosts.add(new URL(SUPABASE_URL).hostname)
    } catch {}
  }
  return hosts
}

export function getPrivateDocumentSourceUrl(storagePath: string): string | null {
  if (!storagePath) return null

  if (/^https?:\/\//i.test(storagePath)) {
    try {
      const parsed = new URL(storagePath)
      if (parsed.protocol !== 'https:' || !configuredHosts().has(parsed.hostname)) return null
      if (parsed.hostname === 'res.cloudinary.com' && !parsed.pathname.startsWith(`/${CLOUDINARY_CLOUD_NAME}/`)) {
        return null
      }
      return parsed.toString()
    } catch {
      return null
    }
  }

  if (CLOUDINARY_CLOUD_NAME) {
    const safePath = storagePath.split('/').map(encodeURIComponent).join('/')
    return `https://res.cloudinary.com/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload/${safePath}`
  }

  return null
}
