import {
  hammingDistance,
  assessImageAngleDiversity,
  ImageFingerprint,
  ANGLE_SLOTS,
  classifyParcelWithAI,
} from '@/lib/parcelVision';

describe('parcelVision', () => {
  describe('hammingDistance', () => {
    it('returns 0 for identical hashes', () => {
      const hash = '1010101010101010';
      expect(hammingDistance(hash, hash)).toBe(0);
    });

    it('returns exact count of differing bits', () => {
      const hashA = '11110000';
      const hashB = '11100001'; // 2 bits differ (index 3 and index 7)
      expect(hammingDistance(hashA, hashB)).toBe(2);
    });
  });

  describe('assessImageAngleDiversity', () => {
    const baseFingerprint: ImageFingerprint = {
      dHash: '1'.repeat(64),
      vHash: '1'.repeat(64),
      meanLuminance: 120,
      variance: 35,
      isTooDark: false,
      isTooBright: false,
      isLowVariance: false,
    };

    it('rejects images that are too dark', () => {
      const darkFingerprint: ImageFingerprint = {
        ...baseFingerprint,
        isTooDark: true,
        meanLuminance: 8,
      };
      const result = assessImageAngleDiversity(darkFingerprint, [], 0);
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('TOO_DARK');
    });

    it('rejects images with low variance / blank content', () => {
      const blankFingerprint: ImageFingerprint = {
        ...baseFingerprint,
        isLowVariance: true,
        variance: 3,
      };
      const result = assessImageAngleDiversity(blankFingerprint, [], 0);
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('BLANK_IMAGE');
    });

    it('rejects exact duplicate images', () => {
      const existing = [baseFingerprint];
      const duplicate: ImageFingerprint = { ...baseFingerprint };
      const result = assessImageAngleDiversity(duplicate, existing, 1);

      expect(result.isValid).toBe(false);
      expect(result.code).toBe('EXACT_DUPLICATE');
    });

    it('rejects images taken from the same camera angle (low bit distance)', () => {
      const existing = [baseFingerprint];
      // 12 bits differ across dHash & vHash (falling in the 9-22 same-angle range)
      const sameAngle: ImageFingerprint = {
        ...baseFingerprint,
        dHash: '000000' + '1'.repeat(58), // 6 bits diff
        vHash: '000000' + '1'.repeat(58), // 6 bits diff
      };
      const result = assessImageAngleDiversity(sameAngle, existing, 1);

      expect(result.isValid).toBe(false);
      expect(result.code).toBe('SAME_ANGLE');
      expect(result.message).toContain('same angle');
    });

    it('accepts photos taken from distinct angles (high bit distance)', () => {
      const existing = [baseFingerprint];
      // 50% differing bits -> distinct perspective
      const distinctAngle: ImageFingerprint = {
        ...baseFingerprint,
        dHash: '0'.repeat(32) + '1'.repeat(32), // 32 bits diff
        vHash: '0'.repeat(32) + '1'.repeat(32), // 32 bits diff
      };
      const result = assessImageAngleDiversity(distinctAngle, existing, 1);

      expect(result.isValid).toBe(true);
      expect(result.code).toBe('OK');
    });

    it('rejects images that are overexposed / too bright', () => {
      const brightFingerprint: ImageFingerprint = {
        ...baseFingerprint,
        isTooBright: true,
        meanLuminance: 250,
      };
      const result = assessImageAngleDiversity(brightFingerprint, [], 0);
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('TOO_BRIGHT');
    });

    it('handles exact boundary thresholds for angle diversity', () => {
      const existing = [baseFingerprint];

      // Total diff = 8 bits -> EXACT_DUPLICATE
      const diff8: ImageFingerprint = {
        ...baseFingerprint,
        dHash: '0'.repeat(4) + '1'.repeat(60),
        vHash: '0'.repeat(4) + '1'.repeat(60),
      };
      expect(assessImageAngleDiversity(diff8, existing, 1).code).toBe('EXACT_DUPLICATE');

      // Total diff = 9 bits -> SAME_ANGLE
      const diff9: ImageFingerprint = {
        ...baseFingerprint,
        dHash: '0'.repeat(5) + '1'.repeat(59),
        vHash: '0'.repeat(4) + '1'.repeat(60),
      };
      expect(assessImageAngleDiversity(diff9, existing, 1).code).toBe('SAME_ANGLE');

      // Total diff = 22 bits -> SAME_ANGLE
      const diff22: ImageFingerprint = {
        ...baseFingerprint,
        dHash: '0'.repeat(11) + '1'.repeat(53),
        vHash: '0'.repeat(11) + '1'.repeat(53),
      };
      expect(assessImageAngleDiversity(diff22, existing, 1).code).toBe('SAME_ANGLE');

      // Total diff = 23 bits -> OK (Distinct angle)
      const diff23: ImageFingerprint = {
        ...baseFingerprint,
        dHash: '0'.repeat(12) + '1'.repeat(52),
        vHash: '0'.repeat(11) + '1'.repeat(53),
      };
      expect(assessImageAngleDiversity(diff23, existing, 1).code).toBe('OK');
      expect(assessImageAngleDiversity(diff23, existing, 1).isValid).toBe(true);
    });
  });

  describe('ANGLE_SLOTS configuration', () => {
    it('defines exactly 4 standardized multi-angle slots with icons and labels', () => {
      expect(ANGLE_SLOTS).toHaveLength(4);
      expect(ANGLE_SLOTS.map((s) => s.id)).toEqual(['front', 'side', 'top', 'label']);
      ANGLE_SLOTS.forEach((slot) => {
        expect(slot.label).toBeTruthy();
        expect(slot.shortLabel).toBeTruthy();
        expect(slot.description).toBeTruthy();
        expect(slot.icon).toBeTruthy();
      });
    });
  });

  describe('classifyParcelWithAI fallback', () => {
    it('returns valid classification gracefully in offline / keyless mode', async () => {
      const prevKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;

      const result = await classifyParcelWithAI('file:///test/item.jpg', 'electronics');
      expect(result.isValidParcel).toBe(true);
      expect(result.detectedItem).toBe('Electronics Parcel');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);

      if (prevKey) {
        process.env.EXPO_PUBLIC_GEMINI_API_KEY = prevKey;
      }
    });
  });
});

