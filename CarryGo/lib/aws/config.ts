export interface BucketConfig {
  name: string;
  cloudfrontDomain: string;
  pathPrefix: string;
}

const AWS_CONFIG = {
  region: process.env.EXPO_PUBLIC_AWS_REGION ?? 'ap-south-1',

  buckets: {
    parcelProofs: {
      name: process.env.EXPO_PUBLIC_AWS_BUCKET_PARCEL_PROOFS ?? 'carrygo-parcel-proofs',
      cloudfrontDomain: process.env.EXPO_PUBLIC_CF_PARCEL_PROOFS ?? 'd1kpta3nvwmxk5.cloudfront.net',
      pathPrefix: 'parcel-proofs',
    },
    userDocuments: {
      name: process.env.EXPO_PUBLIC_AWS_BUCKET_USER_DOCS ?? 'carrygo-user-documents',
      cloudfrontDomain: process.env.EXPO_PUBLIC_CF_USER_DOCS ?? '',
      pathPrefix: 'user-documents-proof',
    },
  },
} as const;

export type BucketId = keyof typeof AWS_CONFIG.buckets;

export function getBucketConfig(bucketId: BucketId): BucketConfig {
  return AWS_CONFIG.buckets[bucketId];
}

export function isAwsConfigured(): boolean {
  return !!(process.env.EXPO_PUBLIC_SUPABASE_URL);
}
