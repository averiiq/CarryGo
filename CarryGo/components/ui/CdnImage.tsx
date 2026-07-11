import React, { useState } from 'react';
import { View } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { getCdnUrl, StorageBucket } from '@/services/storage.service';

interface CdnImageProps extends Omit<ImageProps, 'source'> {
  storageKey: string | null | undefined;
  bucket?: StorageBucket;
  fallbackUri?: string;
}

export function CdnImage({ storageKey, bucket = 'parcels', fallbackUri, style, ...props }: CdnImageProps) {
  const [hasError, setHasError] = useState(false);

  let cdnUrl: string | undefined;
  try {
    cdnUrl = getCdnUrl(storageKey, bucket);
  } catch {
    cdnUrl = undefined;
  }

  const uri = hasError ? fallbackUri : (cdnUrl ?? fallbackUri);
  if (!uri) {
    return <View style={[style as object, { backgroundColor: '#f0f0f0' }]} />;
  }

  return (
    <Image
      source={{ uri }}
      onError={() => setHasError(true)}
      cachePolicy="memory-disk"
      recyclingKey={storageKey ?? fallbackUri}
      style={style}
      {...props}
    />
  );
}
