import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
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
 * Creates a valid base64-encoded JPEG with given dimensions and custom pixel painter
 */
function createValidJpeg(
  width: number,
  height: number,
  drawFn: (setPixel: (x: number, y: number, r: number, g: number, b: number) => void) => void
): string {
  const buf = Buffer.alloc(width * height * 4);
  // Default fill
  buf.fill(0);

  const setPixel = (x: number, y: number, r: number, g: number, b: number) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
    }
  };

  drawFn(setPixel);

  const encoded = jpeg.encode({ data: buf, width, height }, 85);
  return Buffer.from(encoded.data).toString('base64');
}

/**
 * Helper to draw a solid or fill background
 */
function fillSolid(width: number, height: number, r: number, g: number, b: number): string {
  return createValidJpeg(width, height, (setPixel) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        setPixel(x, y, r, g, b);
      }
    }
  });
}

/**
 * Helper to draw a single centered face selfie
 */
function createSingleFaceJpeg(width = 128, height = 128): string {
  return createValidJpeg(width, height, (setPixel) => {
    // Fill background (neutral office/room wall)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        setPixel(x, y, 90, 95, 110);
      }
    }

    // Centered face oval: cx = 64, cy = 64, rx = 24, ry = 32
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const rx = 24;
    const ry = 32;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          // Warm skin tone: R=195, G=140, B=115
          setPixel(x, y, 195, 140, 115);
        }
      }
    }

    // Eyes
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        setPixel(cx - 10 + dx, cy - 8 + dy, 40, 30, 25);
        setPixel(cx + 10 + dx, cy - 8 + dy, 40, 30, 25);
      }
    }

    // Mouth
    for (let dx = -8; dx <= 8; dx++) {
      setPixel(cx + dx, cy + 14, 160, 80, 80);
    }
  });
}

/**
 * Helper to draw two distinct faces in the same frame
 */
function createTwoFacesJpeg(width = 128, height = 128): string {
  return createValidJpeg(width, height, (setPixel) => {
    // Background
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        setPixel(x, y, 70, 75, 90);
      }
    }

    // Face 1 on the left: cx = 32, cy = 64, rx = 18, ry = 25
    const cx1 = 32;
    const cy1 = 64;
    const rx1 = 18;
    const ry1 = 25;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - cx1) / rx1;
        const dy = (y - cy1) / ry1;
        if (dx * dx + dy * dy <= 1) {
          setPixel(x, y, 195, 140, 115);
        }
      }
    }

    // Face 2 on the right: cx = 96, cy = 64, rx = 18, ry = 25
    const cx2 = 96;
    const cy2 = 64;
    const rx2 = 18;
    const ry2 = 25;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - cx2) / rx2;
        const dy = (y - cy2) / ry2;
        if (dx * dx + dy * dy <= 1) {
          setPixel(x, y, 200, 145, 120);
        }
      }
    }
  });
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
      width: 128,
      height: 128,
      base64: undefined,
    });

    const result = await verifyHumanFace('file://selfie.jpg');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Could not process selfie image data');
  });

  it('handles non-JPEG base64 with fallback graceful acceptance', async () => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValueOnce({
      uri: 'file://manipulated.jpg',
      width: 128,
      height: 128,
      base64: Buffer.from('not-a-jpeg').toString('base64'),
    });

    const result = await verifyHumanFace('file://selfie.jpg');
    expect(result.isValid).toBe(true);
    expect(result.faceDetected).toBe(true);
    expect(result.confidence).toBe(85);
  });

  it('detects low lighting and returns appropriate error', async () => {
    const lowLightJpeg = fillSolid(128, 128, 10, 10, 10);
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValueOnce({
      uri: 'file://manipulated.jpg',
      width: 128,
      height: 128,
      base64: lowLightJpeg,
    });

    const result = await verifyHumanFace('file://dark-selfie.jpg');
    expect(result.isValid).toBe(false);
    expect(result.lightingQuality).toBe('low_light');
    expect(result.errorMessage).toContain('Lighting is too dark');
  });

  it('detects overexposure and returns appropriate error', async () => {
    const overexposedJpeg = fillSolid(128, 128, 250, 250, 250);
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValueOnce({
      uri: 'file://manipulated.jpg',
      width: 128,
      height: 128,
      base64: overexposedJpeg,
    });

    const result = await verifyHumanFace('file://bright-selfie.jpg');
    expect(result.isValid).toBe(false);
    expect(result.lightingQuality).toBe('overexposed');
    expect(result.errorMessage).toContain('overexposed');
  });

  it('verifies a valid single face selfie successfully', async () => {
    const singleFaceJpeg = createSingleFaceJpeg();
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValueOnce({
      uri: 'file://manipulated.jpg',
      width: 128,
      height: 128,
      base64: singleFaceJpeg,
    });

    const result = await verifyHumanFace('file://valid-selfie.jpg');
    expect(result.isValid).toBe(true);
    expect(result.faceDetected).toBe(true);
    expect(result.faceCount).toBe(1);
    expect(result.isCentered).toBe(true);
    expect(result.lightingQuality).toBe('good');
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('detects multiple faces when two people are in frame and rejects with clear message', async () => {
    const twoFacesJpeg = createTwoFacesJpeg();
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValueOnce({
      uri: 'file://manipulated.jpg',
      width: 128,
      height: 128,
      base64: twoFacesJpeg,
    });

    const result = await verifyHumanFace('file://two-faces.jpg');
    expect(result.isValid).toBe(false);
    expect(result.faceDetected).toBe(true);
    expect(result.faceCount).toBe(2);
    expect(result.errorMessage).toContain('Multiple faces detected');
  });

  it('detects when no human face is visible in the frame', async () => {
    // Blue neutral image with no skin tones
    const noSkinJpeg = fillSolid(128, 128, 50, 80, 180);
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValueOnce({
      uri: 'file://manipulated.jpg',
      width: 128,
      height: 128,
      base64: noSkinJpeg,
    });

    const result = await verifyHumanFace('file://no-face.jpg');
    expect(result.isValid).toBe(false);
    expect(result.faceDetected).toBe(false);
    expect(result.faceCount).toBe(0);
    expect(result.errorMessage).toContain('No human face detected');
  });

  it('handles exception in manipulateAsync gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Camera hardware failure')
    );

    const result = await verifyHumanFace('file://broken-selfie.jpg');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Face analysis failed');
    consoleSpy.mockRestore();
  });
});

