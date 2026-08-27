export type CmsBackendProvider = 'supabase' | 'aws'

export function getCmsBackendProvider(): CmsBackendProvider {
  const raw = process.env.CARRYGO_BACKEND_PROVIDER?.toLowerCase()
  if (raw === 'aws') {
    return 'aws'
  }

  return 'supabase'
}

export function isAwsCmsBackendEnabled(): boolean {
  return getCmsBackendProvider() === 'aws'
}

