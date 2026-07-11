// AWS module removed — migrated to Cloudinary
// Kept for backward compatibility with any remaining imports.

export { getBucketConfig, isAwsConfigured } from './config';
export type { BucketConfig, BucketId } from './config';
export { signS3PutRequest } from './signing';
export type { S3PutParams, SignedRequest } from './signing';
