import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export type ImagePreset = 'avatar' | 'parcel' | 'kyc' | 'delivery_proof' | 'thumbnail';

interface PresetConfig {
  maxWidth: number;
  quality: number;
}

const PRESETS: Record<ImagePreset, PresetConfig> = {
  avatar: { maxWidth: 512, quality: 0.75 },
  parcel: { maxWidth: 1200, quality: 0.72 },
  kyc: { maxWidth: 1600, quality: 0.8 },
  delivery_proof: { maxWidth: 1200, quality: 0.7 },
  thumbnail: { maxWidth: 300, quality: 0.65 },
};

export interface OptimizedImage {
  uri: string;
  width: number;
  height: number;
  mimeType: 'image/webp' | 'image/jpeg';
  sizeBytes: number;
  extension: 'webp' | 'jpg';
}

function supportsWebP(): boolean {
  return ImageManipulator.SaveFormat.WEBP !== undefined;
}

async function getFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  if (info.exists && 'size' in info && typeof info.size === 'number' && info.size > 0) {
    return info.size;
  }
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return Math.ceil((base64.length * 3) / 4);
}

export async function optimizeImage(
  uri: string,
  preset: ImagePreset
): Promise<OptimizedImage> {
  const config = PRESETS[preset];
  const useWebP = supportsWebP();
  const format = useWebP ? ImageManipulator.SaveFormat.WEBP : ImageManipulator.SaveFormat.JPEG;

  const sourceInfo = await ImageManipulator.manipulateAsync(uri, [], {});
  const sourceWidth = sourceInfo.width;

  const actions: ImageManipulator.Action[] = [];
  if (sourceWidth > config.maxWidth) {
    actions.push({ resize: { width: config.maxWidth } });
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: config.quality,
    format,
  });

  const sizeBytes = await getFileSize(result.uri);

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: useWebP ? 'image/webp' : 'image/jpeg',
    sizeBytes,
    extension: useWebP ? 'webp' : 'jpg',
  };
}

export async function optimizeWithThumbnail(
  uri: string,
  preset: ImagePreset
): Promise<{ main: OptimizedImage; thumbnail: OptimizedImage }> {
  const [main, thumbnail] = await Promise.all([
    optimizeImage(uri, preset),
    optimizeImage(uri, 'thumbnail'),
  ]);
  return { main, thumbnail };
}
