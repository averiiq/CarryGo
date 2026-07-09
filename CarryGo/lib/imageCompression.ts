import { optimizeImage } from './imageOptimizer';

interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * @deprecated Use optimizeImage() from '@/lib/imageOptimizer' with a preset instead.
 */
export async function compressImage(uri: string): Promise<CompressedImage> {
  const result = await optimizeImage(uri, 'kyc');
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}
