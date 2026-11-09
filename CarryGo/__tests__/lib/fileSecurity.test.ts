import {
  validateImageUpload,
  formatFileSize,
  getFileExtension,
} from '../../lib/fileSecurity';

describe('fileSecurity', () => {
  describe('getFileExtension', () => {
    it('extracts extension correctly', () => {
      expect(getFileExtension('file.png')).toBe('png');
      expect(getFileExtension('folder/photo.JPG')).toBe('jpg');
      expect(getFileExtension('https://cdn.example.com/asset.webp?token=123')).toBe('webp');
      expect(getFileExtension('no_extension')).toBe('');
      expect(getFileExtension('')).toBe('');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes, KB, and MB accurately', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
      expect(formatFileSize(0)).toBe('0 B');
    });
  });

  describe('validateImageUpload', () => {
    it('accepts valid JPEG, PNG, and WEBP image assets', () => {
      const validAsset = {
        uri: 'file:///data/user/0/cache/parcel.jpg',
        fileSize: 1024 * 500, // 500 KB
        mimeType: 'image/jpeg',
      };
      const result = validateImageUpload(validAsset);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects missing or empty URI', () => {
      const result = validateImageUpload({ uri: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Invalid or missing/);
    });

    it('rejects files larger than max size', () => {
      const largeAsset = {
        uri: 'file:///data/huge.png',
        fileSize: 15 * 1024 * 1024, // 15MB
        mimeType: 'image/png',
      };
      const result = validateImageUpload(largeAsset, { maxSizeBytes: 10 * 1024 * 1024 });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/too large/);
    });

    it('rejects empty files (0 bytes)', () => {
      const emptyAsset = {
        uri: 'file:///data/empty.png',
        fileSize: 0,
        mimeType: 'image/png',
      };
      const result = validateImageUpload(emptyAsset);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Empty file/);
    });

    it('rejects non-image MIME types (e.g. PDF, executable)', () => {
      const pdfAsset = {
        uri: 'file:///data/document.pdf',
        fileSize: 1024 * 100,
        mimeType: 'application/pdf',
      };
      const result = validateImageUpload(pdfAsset);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Unsupported file format/);
    });

    it('rejects dangerous or disallowed file extensions', () => {
      const exeAsset = {
        uri: 'file:///data/payload.exe',
        fileSize: 1024 * 50,
      };
      const result = validateImageUpload(exeAsset);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Unsupported file extension/);
    });
  });
});

