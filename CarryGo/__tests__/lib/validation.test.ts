import {
  validateEmail,
  validatePhone,
  validateCityName,
  validateAmount,
  validateWeight,
  validateDescription,
  validateUUID,
} from '@/lib/validation';

describe('validateEmail', () => {
  it('rejects empty input', () => {
    expect(validateEmail('')).toEqual({ valid: false, error: 'Email is required' });
  });

  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true });
  });

  it('rejects invalid format', () => {
    expect(validateEmail('not-an-email').valid).toBe(false);
  });

  it('rejects excessively long email', () => {
    const long = 'a'.repeat(250) + '@b.com';
    expect(validateEmail(long).valid).toBe(false);
  });

  it('trims whitespace', () => {
    expect(validateEmail('  user@example.com  ')).toEqual({ valid: true });
  });
});

describe('validatePhone', () => {
  it('rejects empty input', () => {
    expect(validatePhone('').valid).toBe(false);
  });

  it('accepts valid Indian number', () => {
    expect(validatePhone('9876543210')).toEqual({ valid: true });
  });

  it('accepts with +91 prefix', () => {
    expect(validatePhone('+91 9876543210')).toEqual({ valid: true });
  });

  it('rejects number starting with invalid digit', () => {
    expect(validatePhone('1234567890').valid).toBe(false);
  });

  it('rejects too short number', () => {
    expect(validatePhone('987654').valid).toBe(false);
  });
});

describe('validateCityName', () => {
  it('rejects empty input', () => {
    expect(validateCityName('').valid).toBe(false);
  });

  it('accepts valid city name', () => {
    expect(validateCityName('Mumbai')).toEqual({ valid: true });
  });

  it('rejects single character', () => {
    expect(validateCityName('A').valid).toBe(false);
  });

  it('rejects SQL injection characters', () => {
    expect(validateCityName("Mumbai'; DROP TABLE--").valid).toBe(false);
  });

  it('rejects overly long name', () => {
    expect(validateCityName('A'.repeat(101)).valid).toBe(false);
  });
});

describe('validateAmount', () => {
  it('rejects NaN', () => {
    expect(validateAmount(NaN).valid).toBe(false);
  });

  it('rejects Infinity', () => {
    expect(validateAmount(Infinity).valid).toBe(false);
  });

  it('rejects negative when min is 0', () => {
    expect(validateAmount(-1).valid).toBe(false);
  });

  it('accepts amount within range', () => {
    expect(validateAmount(500)).toEqual({ valid: true });
  });

  it('rejects amount above max', () => {
    expect(validateAmount(2_000_000).valid).toBe(false);
  });

  it('respects custom min/max', () => {
    expect(validateAmount(5, 10, 100).valid).toBe(false);
    expect(validateAmount(50, 10, 100)).toEqual({ valid: true });
  });
});

describe('validateWeight', () => {
  it('rejects NaN', () => {
    expect(validateWeight(NaN).valid).toBe(false);
  });

  it('rejects too light', () => {
    expect(validateWeight(0.05).valid).toBe(false);
  });

  it('rejects too heavy', () => {
    expect(validateWeight(501).valid).toBe(false);
  });

  it('accepts valid weight', () => {
    expect(validateWeight(5)).toEqual({ valid: true });
  });

  it('accepts boundary values', () => {
    expect(validateWeight(0.1)).toEqual({ valid: true });
    expect(validateWeight(500)).toEqual({ valid: true });
  });
});

describe('validateDescription', () => {
  it('rejects empty', () => {
    expect(validateDescription('').valid).toBe(false);
  });

  it('accepts valid description', () => {
    expect(validateDescription('A laptop in protective case')).toEqual({ valid: true });
  });

  it('rejects overly long description', () => {
    expect(validateDescription('a'.repeat(1001)).valid).toBe(false);
  });

  it('rejects HTML script tags', () => {
    expect(validateDescription('<script>alert("xss")</script>').valid).toBe(false);
  });

  it('rejects generic HTML tags', () => {
    expect(validateDescription('<img src=x onerror=alert(1)>').valid).toBe(false);
  });

  it('accepts plain text with special chars', () => {
    expect(validateDescription('Package with dimensions 10x20x30 cm & fragile items')).toEqual({ valid: true });
  });
});

describe('validateUUID', () => {
  it('rejects empty', () => {
    expect(validateUUID('').valid).toBe(false);
  });

  it('accepts valid UUID v4', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toEqual({ valid: true });
  });

  it('rejects invalid format', () => {
    expect(validateUUID('not-a-uuid').valid).toBe(false);
  });

  it('rejects partial UUID', () => {
    expect(validateUUID('550e8400-e29b').valid).toBe(false);
  });
});
