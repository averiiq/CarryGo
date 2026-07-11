// AWS config removed — migrated to Cloudinary
// This file is kept temporarily to avoid import errors from any stale references.
// Safe to delete once all imports are verified clean.

export interface BucketConfig {
  name: string;
  cloudfrontDomain: string;
  pathPrefix: string;
}

export type BucketId = 'parcelProofs' | 'userDocuments';

export function getBucketConfig(_bucketId: BucketId): BucketConfig {
  throw new Error('AWS S3 has been replaced by Cloudinary. Update imports to use @/lib/cloudinary.');
}

export function isAwsConfigured(): boolean {
  return false;
}
