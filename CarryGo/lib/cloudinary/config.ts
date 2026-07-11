export const CLOUDINARY_CONFIG = {
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',
  uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'carrygo_uploads',
};

export type StorageFolder = 'avatars' | 'parcels' | 'kyc-documents' | 'delivery-proofs';

export function getUploadUrl(): string {
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
}

export function getRawUploadUrl(): string {
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/raw/upload`;
}

export function isCloudinaryConfigured(): boolean {
  return !!CLOUDINARY_CONFIG.cloudName;
}

export function buildCloudinaryUrl(publicId: string, options?: { width?: number; quality?: string; format?: string }): string {
  const { cloudName } = CLOUDINARY_CONFIG;
  if (!cloudName) return '';

  const transforms: string[] = [];
  if (options?.width) transforms.push(`w_${options.width}`);
  if (options?.quality) transforms.push(`q_${options.quality}`);
  if (options?.format) transforms.push(`f_${options.format}`);

  const transformStr = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}${publicId}`;
}
