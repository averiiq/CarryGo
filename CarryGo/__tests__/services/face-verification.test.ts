import * as ImageManipulator from 'expo-image-manipulator';
import { verifyHumanFace } from '../../services/face-verification.service';

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

// Polyfill atob for test environment if needed
if (typeof global.atob === 'undefined') {
  global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
}

/**
 * Helper to create a synthetic JPEG byte array with given dimensions and fill byte
 */
function createSyntheticJpeg(width: number, height: number, fillByte: number): string {
  const header = [
    0xff, 0xd8, // SOI
    // SOF0 segment (0xFFC0, length 17 = 0x0011, precision 8, height, width, 3 components)
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    // SOS segment (0xFFDA, length 8)
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00,
  ];

  // Scan data
  const scanDataSize = width * height;
  const scanData = new Uint8Array(scanDataSize);
  scanData.fill(fillByte);

  const footer = [0xff, 0xd9]; // EOI

  const totalLength = header.length + scanData.length + footer.length;
  const fullBytes = new Uint8Array(totalLength);
  fullBytes.set(header, 0);
  fullBytes.set(scanData, header.length);
  fullBytes.set(footer, header.length + scanData.length);

  let binary = '';
  for (let i = 0; i < fullBytes.length; i++) {
    binary += String.fromCharCode(fullBytes[i]);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

describe('Face Verification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when image URI is empty', async () => {
    const result = await verifyHumanFace('');
    expect(result.isValid).toBe(false);
    expect(result.faceDetected).toBe(false);
    expect(result.errorMessage).toContain('No image provided');
  });

  it('handles image manipulator returning no base64', async () => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValueOnce({
      uri: 'file://manipulated.jpg',
      width: 160,
      height: 160,
      base64: undefined,
    });

    const result = await verifyHumanFace('file://selfie.jpg');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Could not process selfie image data');
  });

  it('handles non-JPEG base64 with fallback graceful acceptance', async () => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValueOnce({
      uri: 'file://manipulated.jpg',
      width: 160,
      height: 160,
      base64: Buffer.from('not-a-jpeg').toString('base64'),
    });

    const result = await verifyHumanFace('file://selfie.jpg');
    expect(result.isValid).toBe(true);
    expect(result.faceDetected).toBe(true);
    expect(result.confidence).toBe(85);
  });

  it('detects low lighting and returns appropriate error', async () => {
    // Fill with very low luminance (value 10)
    const lowLightJpeg = createSyntheticJpeg(160, 160, 10);
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValueOnce({
      uri: 'file://manipulated.jpg',
      width: 160,
      height: 160,
      base64: lowLightJpeg,
    });

    const result = await verifyHumanFace('file://dark-selfie.jpg');
    expect(result.isValid).toBe(false);
    expect(result.lightingQuality).toBe('low_light');
    expect(result.errorMessage).toContain('Lighting is too dark');
  });

  it('detects overexposure and returns appropriate error', async () => {
    // Fill with very high luminance (value 250)
    const overexposedJpeg = createSyntheticJpeg(160, 160, 250);
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValueOnce({
      uri: 'file://manipulated.jpg',
      width: 160,
      height: 160,
      base64: overexposedJpeg,
    });

    const result = await verifyHumanFace('file://bright-selfie.jpg');
    expect(result.isValid).toBe(false);
    expect(result.lightingQuality).toBe('overexposed');
    expect(result.errorMessage).toContain('overexposed');
  });

  it('handles exception in manipulateAsync gracefully', async () => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Camera hardware failure')
    );

    const result = await verifyHumanFace('file://broken-selfie.jpg');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Face analysis failed');
  });
});
