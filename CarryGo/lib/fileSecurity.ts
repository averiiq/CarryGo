/**
 * File upload validation & security guard.
 * Validates file sizes, MIME types, extensions, and guards against malformed or excessive payloads.
 */

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileSizeFormatted?: string;
}

export const DEFAULT_MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(uriOrFileName: string): string {
  if (!uriOrFileName) return '';
  const clean = uriOrFileName.split('?')[0].split('#')[0];
  const lastDot = clean.lastIndexOf('.');
  if (lastDot === -1) return '';
  return clean.slice(lastDot + 1).toLowerCase();
}

/**
 * Validates an image asset before upload or processing.
 */
export function validateImageUpload(
  asset: {
    uri: string;
    fileSize?: number;
    mimeType?: string;
    fileName?: string | null;
  },
  options?: FileValidationOptions
): FileValidationResult {
  if (!asset || !asset.uri || typeof asset.uri !== 'string' || asset.uri.trim() === '') {
    return { valid: false, error: 'Invalid or missing file source.' };
  }

  const maxBytes = options?.maxSizeBytes ?? DEFAULT_MAX_IMAGE_SIZE_BYTES;
  const allowedMimes = options?.allowedMimeTypes ?? ALLOWED_IMAGE_MIME_TYPES;
  const allowedExts = options?.allowedExtensions ?? ALLOWED_IMAGE_EXTENSIONS;

  // 1. File size check
  if (asset.fileSize !== undefined) {
    if (asset.fileSize <= 0) {
      return { valid: false, error: 'Empty file cannot be uploaded.' };
    }
    if (asset.fileSize > maxBytes) {
      const maxFormatted = formatFileSize(maxBytes);
      const actualFormatted = formatFileSize(asset.fileSize);
      return {
        valid: false,
        error: `File is too large (${actualFormatted}). Maximum allowed size is ${maxFormatted}.`,
        fileSizeFormatted: actualFormatted,
      };
    }
  }

  // 2. MIME type check (when available)
  if (asset.mimeType) {
    const cleanMime = asset.mimeType.toLowerCase().trim();
    const isAllowedMime = allowedMimes.some(
      (m) => cleanMime === m || (m === 'image/jpeg' && cleanMime === 'image/jpg')
    );
    if (!isAllowedMime) {
      return {
        valid: false,
        error: `Unsupported file format (${asset.mimeType}). Please select a JPG, PNG, or WEBP image.`,
      };
    }
  }

  // 3. Extension check
  const ext = getFileExtension(asset.fileName || asset.uri);
  if (ext && !allowedExts.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension (.${ext}). Only standard images are supported.`,
    };
  }

  return {
    valid: true,
    fileSizeFormatted: asset.fileSize ? formatFileSize(asset.fileSize) : undefined,
  };
}

