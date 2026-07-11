// AWS signing removed — migrated to Cloudinary
// This file is kept temporarily to avoid import errors from any stale references.

export interface S3PutParams {
  bucketId: string;
  key: string;
  contentType: string;
  contentLength: number;
  fileUri: string;
}

export interface SignedRequest {
  url: string;
  headers: Record<string, string>;
  cdnUrl: string;
}

export async function signS3PutRequest(_params: S3PutParams): Promise<SignedRequest> {
  throw new Error('AWS S3 has been replaced by Cloudinary. Update imports to use @/lib/cloudinary.');
}
