export interface BucketConfig {
  name: string;
  cloudfrontDomain: string;
  pathPrefix: string;
}

const AWS_CONFIG = {
  region: process.env.EXPO_PUBLIC_AWS_REGION ?? 'ap-south-1',
  accessKeyId: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY ?? '',

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

export function getAwsConfig() {
  if (!AWS_CONFIG.accessKeyId || !AWS_CONFIG.secretAccessKey) {
    throw new Error(
      '[AWS] Missing credentials. Set EXPO_PUBLIC_AWS_ACCESS_KEY_ID and ' +
      'EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY in .env'
    );
  }
  return AWS_CONFIG;
}

export function getBucketConfig(bucketId: BucketId): BucketConfig {
  return AWS_CONFIG.buckets[bucketId];
}

export function isAwsConfigured(): boolean {
  return !!(AWS_CONFIG.accessKeyId && AWS_CONFIG.secretAccessKey);
}
