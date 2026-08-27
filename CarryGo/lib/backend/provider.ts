export type BackendProvider = 'supabase' | 'aws';

export function getBackendProvider(): BackendProvider {
  const explicit = process.env.EXPO_PUBLIC_BACKEND_PROVIDER?.toLowerCase();

  if (explicit === 'aws') {
    return 'aws';
  }

  return 'supabase';
}

export function isAwsBackendEnabled(): boolean {
  return getBackendProvider() === 'aws';
}

