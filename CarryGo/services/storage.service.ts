import * as FileSystem from 'expo-file-system';
import { getBucketConfig, isAwsConfigured, signS3PutRequest, BucketId } from '@/lib/aws';
import { optimizeImage, optimizeWithThumbnail, ImagePreset, OptimizedImage } from '@/lib/imageOptimizer';
import { captureException } from '@/lib/monitoring';
import { isValidUuid } from '@/lib/sanitize';

export type StorageBucket =
  | 'avatars'
  | 'parcels'
  | 'kyc-documents'
  | 'delivery-proofs';

const BUCKET_MAPPING: Record<StorageBucket, BucketId> = {
  'avatars': 'userDocuments',
  'kyc-documents': 'userDocuments',
  'parcels': 'parcelProofs',
  'delivery-proofs': 'parcelProofs',
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

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

function buildStorageKey(bucket: StorageBucket, userId: string, fileName: string, extension: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  return `${bucket}/${userId}/${date}/${fileName}.${extension}`;
}

function buildCdnUrl(bucketId: BucketId, fullKey: string): string {
  const config = getBucketConfig(bucketId);
  if (config.cloudfrontDomain) {
    return `https://${config.cloudfrontDomain}/${config.pathPrefix}/${fullKey}`;
  }
  return `https://${config.name}.s3.ap-south-1.amazonaws.com/${config.pathPrefix}/${fullKey}`;
}

const MAX_RETRIES = 2;

interface S3UploadResult {
  cdnUrl: string;
}

async function uploadToS3(optimized: OptimizedImage, key: string, bucketId: BucketId): Promise<S3UploadResult> {
  if (optimized.sizeBytes <= 0) {
    throw new Error('Image optimization produced empty file. Please try again.');
  }

  if (!ALLOWED_MIME_TYPES.includes(optimized.mimeType)) {
    throw new Error(`Invalid file type: ${optimized.mimeType}. Allowed: JPEG, PNG, WebP, PDF.`);
  }

  if (optimized.sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large (${(optimized.sizeBytes / 1024 / 1024).toFixed(1)}MB). Maximum: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`);
  }

  const signed = await signS3PutRequest({
    bucketId,
    key,
    contentType: optimized.mimeType,
    contentLength: optimized.sizeBytes,
  });

  let lastError: string = '';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const uploadResult = await FileSystem.uploadAsync(signed.url, optimized.uri, {
      httpMethod: 'PUT',
      headers: signed.headers,
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    if (uploadResult.status >= 200 && uploadResult.status < 300) {
      return { cdnUrl: signed.cdnUrl };
    }

    lastError = `${uploadResult.status}: ${uploadResult.body?.slice(0, 200) ?? 'unknown'}`;

    if (uploadResult.status === 403 || uploadResult.status === 401) {
      throw new Error(`Upload denied (${uploadResult.status}). Please re-authenticate and try again.`);
    }

    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  throw new Error(`Upload failed after ${MAX_RETRIES + 1} attempts. Last: ${lastError}`);
}

export async function uploadImage(
  fileUri: string,
  options: UploadOptions
): Promise<{ data: UploadResult | null; error: string | null }> {
  try {
    if (!isAwsConfigured()) {
      return { data: null, error: 'Storage is not configured. Check AWS credentials.' };
    }

    if (!isValidUuid(options.userId)) {
      return { data: null, error: 'Invalid user ID.' };
    }

    const bucketId = BUCKET_MAPPING[options.bucket];

    if (options.generateThumbnail) {
      const { main, thumbnail } = await optimizeWithThumbnail(fileUri, options.preset);

      const mainKey = buildStorageKey(options.bucket, options.userId, options.fileName, main.extension);
      const thumbKey = buildStorageKey(options.bucket, options.userId, `${options.fileName}_thumb`, thumbnail.extension);

      const [mainResult, thumbResult] = await Promise.all([
        uploadToS3(main, mainKey, bucketId),
        uploadToS3(thumbnail, thumbKey, bucketId),
      ]);

      return {
        data: {
          key: mainKey,
          cdnUrl: mainResult.cdnUrl,
          thumbnailKey: thumbKey,
          thumbnailCdnUrl: thumbResult.cdnUrl,
          sizeBytes: main.sizeBytes,
          mimeType: main.mimeType,
        },
        error: null,
      };
    }

    const optimized = await optimizeImage(fileUri, options.preset);
    const key = buildStorageKey(options.bucket, options.userId, options.fileName, optimized.extension);

    const result = await uploadToS3(optimized, key, bucketId);

    return {
      data: {
        key,
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

export function getCdnUrl(key: string | null | undefined, bucket: StorageBucket = 'parcels'): string | undefined {
  if (!key) return undefined;
  const bucketId = BUCKET_MAPPING[bucket];
  return buildCdnUrl(bucketId, key);
}
