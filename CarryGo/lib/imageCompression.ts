import * as ImageManipulator from 'expo-image-manipulator';

interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.8;

export async function compressImage(uri: string): Promise<CompressedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}
