import React from 'react';
import { Image, ImageProps } from 'expo-image';
import { getCdnUrl, StorageBucket } from '@/services/storage.service';

interface CdnImageProps extends Omit<ImageProps, 'source'> {
  storageKey: string | null | undefined;
  bucket?: StorageBucket;
  fallbackUri?: string;
}

export function CdnImage({ storageKey, bucket = 'parcels', fallbackUri, ...props }: CdnImageProps) {
  const cdnUrl = getCdnUrl(storageKey, bucket);
  const source = cdnUrl
    ? { uri: cdnUrl }
    : fallbackUri
      ? { uri: fallbackUri }
      : undefined;

  if (!source) return null;

  return (
    <Image
      source={source}
      cachePolicy="memory-disk"
      recyclingKey={storageKey ?? fallbackUri}
      {...props}
    />
  );
}
