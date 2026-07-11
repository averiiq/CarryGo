import * as FileSystem from 'expo-file-system';
import { isCloudinaryConfigured, getUploadUrl, buildCloudinaryUrl } from '@/lib/cloudinary';
import { optimizeImage, optimizeWithThumbnail, ImagePreset, OptimizedImage } from '@/lib/imageOptimizer';
import { captureException } from '@/lib/monitoring';
import { isValidUuid } from '@/lib/sanitize';
import { getSupabaseClient } from '@/template';

export type StorageBucket =
  | 'avatars'
  | 'parcels'
  | 'kyc-documents'
  | 'delivery-proofs';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

interface UploadResult {
  key: string;
  cdnUrl: string;
  thumbnailKey?: string;
  thumbnailCdnUrl?: string;
  sizeBytes: number;
  mimeType: string;
}

interface UploadOptions {
  bucket: StorageBucket;
  userId: string;
  fileName: string;
  preset: ImagePreset;
  generateThumbnail?: boolean;
}

interface SignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  publicId: string;
}

function buildPublicId(bucket: StorageBucket, userId: string, fileName: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  return `${bucket}/${userId}/${date}/${fileName}`;
}

async function getSignature(bucket: StorageBucket, publicId: string): Promise<SignatureResponse> {
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
      body: JSON.stringify({ folder: bucket, publicId }),
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Upload authorization failed' }));
    throw new Error(body.error || `Upload authorization failed (${response.status})`);
  }

  return response.json();
}

async function uploadToCloudinary(
  optimized: OptimizedImage,
  bucket: StorageBucket,
  userId: string,
  fileName: string
): Promise<{ cdnUrl: string; publicId: string }> {
  if (optimized.sizeBytes <= 0) {
    throw new Error('Image optimization produced empty file. Please try again.');
  }

  if (!ALLOWED_MIME_TYPES.includes(optimized.mimeType)) {
    throw new Error(`Invalid file type: ${optimized.mimeType}. Allowed: JPEG, PNG, WebP.`);
  }

  if (optimized.sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large (${(optimized.sizeBytes / 1024 / 1024).toFixed(1)} MB). Maximum: 15 MB.`);
  }

  const publicId = buildPublicId(bucket, userId, fileName);
  const sig = await getSignature(bucket, publicId);
  const uploadUrl = getUploadUrl();

  const MAX_RETRIES = 2;
  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await FileSystem.uploadAsync(uploadUrl, optimized.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      parameters: {
        api_key: sig.apiKey,
        timestamp: String(sig.timestamp),
        signature: sig.signature,
        public_id: sig.publicId,
      },
    });

    if (result.status >= 200 && result.status < 300) {
      try {
        await FileSystem.deleteAsync(optimized.uri, { idempotent: true });
      } catch {}
      const data = JSON.parse(result.body);
      return { cdnUrl: data.secure_url, publicId: data.public_id };
    }

    lastError = `${result.status}: ${result.body?.slice(0, 200) ?? 'unknown'}`;

    if (result.status >= 400 && result.status < 500) {
      let msg = `Upload failed (${result.status})`;
      try {
        const errBody = JSON.parse(result.body);
        msg = errBody.error?.message || msg;
      } catch {}
      throw new Error(msg);
    }

    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  throw new Error(`Upload failed after retries. Last error: ${lastError}`);
}

export async function uploadImage(
  fileUri: string,
  options: UploadOptions
): Promise<{ data: UploadResult | null; error: string | null }> {
  try {
    if (!isCloudinaryConfigured()) {
      return { data: null, error: 'Storage is not configured. Check Cloudinary credentials.' };
    }

    if (!isValidUuid(options.userId)) {
      return { data: null, error: 'Invalid user ID.' };
    }

    if (options.generateThumbnail) {
      const { main, thumbnail } = await optimizeWithThumbnail(fileUri, options.preset);

      const [mainResult, thumbResult] = await Promise.all([
        uploadToCloudinary(main, options.bucket, options.userId, options.fileName),
        uploadToCloudinary(thumbnail, options.bucket, options.userId, `${options.fileName}_thumb`),
      ]);

      return {
        data: {
          key: mainResult.publicId,
          cdnUrl: mainResult.cdnUrl,
          thumbnailKey: thumbResult.publicId,
          thumbnailCdnUrl: thumbResult.cdnUrl,
          sizeBytes: main.sizeBytes,
          mimeType: main.mimeType,
        },
        error: null,
      };
    }

    const optimized = await optimizeImage(fileUri, options.preset);
    const result = await uploadToCloudinary(optimized, options.bucket, options.userId, options.fileName);

    return {
      data: {
        key: result.publicId,
        cdnUrl: result.cdnUrl,
        sizeBytes: optimized.sizeBytes,
        mimeType: optimized.mimeType,
      },
      error: null,
    };
  } catch (err) {
    captureException(err, { context: 'storage.uploadImage', bucket: options.bucket });
    const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
    return { data: null, error: message };
  }
}

export async function uploadKycDocument(
  fileUri: string,
  userId: string,
  sessionId: string,
  documentType: string
): Promise<{ data: UploadResult | null; error: string | null }> {
  return uploadImage(fileUri, {
    bucket: 'kyc-documents',
    userId,
    fileName: `${sessionId}_${documentType}`,
    preset: 'kyc',
  });
}

export async function uploadParcelImage(
  fileUri: string,
  userId: string,
  parcelId: string
): Promise<{ data: UploadResult | null; error: string | null }> {
  return uploadImage(fileUri, {
    bucket: 'parcels',
    userId,
    fileName: parcelId,
    preset: 'parcel',
    generateThumbnail: true,
  });
}

export async function uploadDeliveryProof(
  fileUri: string,
  userId: string,
  deliveryId: string,
  type: 'pickup' | 'delivery'
): Promise<{ data: UploadResult | null; error: string | null }> {
  return uploadImage(fileUri, {
    bucket: 'delivery-proofs',
    userId,
    fileName: `${deliveryId}_${type}`,
    preset: 'delivery_proof',
  });
}

export async function uploadAvatar(
  fileUri: string,
  userId: string
): Promise<{ data: UploadResult | null; error: string | null }> {
  return uploadImage(fileUri, {
    bucket: 'avatars',
    userId,
    fileName: 'profile',
    preset: 'avatar',
    generateThumbnail: true,
  });
}

export function getCdnUrl(key: string | null | undefined, _bucket: StorageBucket = 'parcels'): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('http')) return key;
  return buildCloudinaryUrl(key);
}
