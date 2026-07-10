import { getSupabaseClient } from '@/template';
import { BucketId } from './config';

export interface S3PutParams {
  bucketId: BucketId;
  key: string;
  contentType: string;
  contentLength: number;
}

export interface SignedRequest {
  url: string;
  headers: Record<string, string>;
  cdnUrl: string;
}

export async function signS3PutRequest(params: S3PutParams): Promise<SignedRequest> {
  const sb = getSupabaseClient();

  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error('Authentication required for file uploads');
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/generate-upload-url`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify({
        bucketId: params.bucketId,
        key: params.key,
        contentType: params.contentType,
        contentLength: params.contentLength,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Upload authorization failed' }));
    throw new Error(body.error || `Upload authorization failed (${response.status})`);
  }

  return await response.json() as SignedRequest;
}
