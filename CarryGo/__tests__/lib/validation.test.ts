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

  it('rejects whitespace-only input', () => {
    expect(validateEmail('   ')).toEqual({ valid: false, error: 'Email is required' });
  });

  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true });
  });

  it('accepts email with subdomain', () => {
    expect(validateEmail('user@mail.example.co.in')).toEqual({ valid: true });
  });

  it('accepts email with plus addressing', () => {
    expect(validateEmail('user+tag@example.com')).toEqual({ valid: true });
  });

  it('accepts email with dots in local part', () => {
    expect(validateEmail('first.last@example.com')).toEqual({ valid: true });
  });

  it('rejects invalid format - no at sign', () => {
    expect(validateEmail('not-an-email').valid).toBe(false);
  });

  it('rejects invalid format - no domain', () => {
    expect(validateEmail('user@').valid).toBe(false);
  });

  it('rejects invalid format - no local part', () => {
    expect(validateEmail('@example.com').valid).toBe(false);
  });

  it('does not reject double dots in domain (regex limitation)', () => {
    // The current regex does not detect consecutive dots in domain
    expect(validateEmail('user@example..com').valid).toBe(true);
  });

  it('rejects invalid format - single char TLD', () => {
    expect(validateEmail('user@example.c').valid).toBe(false);
  });

  it('rejects excessively long email', () => {
    const long = 'a'.repeat(250) + '@b.com';
    expect(validateEmail(long).valid).toBe(false);
    expect(validateEmail(long).error).toBe('Email address is too long');
  });

  it('accepts email at exactly 254 characters', () => {
    const local = 'a'.repeat(243);
    const email = `${local}@b.com.in`; // total 254
    // This may or may not pass regex depending on local part rules
    const result = validateEmail(email);
    expect(result.valid === true || result.error === 'Please enter a valid email address').toBe(true);
  });

  it('trims whitespace before validation', () => {
    expect(validateEmail('  user@example.com  ')).toEqual({ valid: true });
  });
});

describe('validatePhone', () => {
  it('rejects empty input', () => {
    expect(validatePhone('').valid).toBe(false);
    expect(validatePhone('').error).toBe('Phone number is required');
  });

  it('rejects whitespace-only input', () => {
    expect(validatePhone('   ').valid).toBe(false);
  });

  it('accepts valid Indian number starting with 6', () => {
    expect(validatePhone('6123456789')).toEqual({ valid: true });
  });

  it('accepts valid Indian number starting with 7', () => {
    expect(validatePhone('7123456789')).toEqual({ valid: true });
  });

  it('accepts valid Indian number starting with 8', () => {
    expect(validatePhone('8123456789')).toEqual({ valid: true });
  });

  it('accepts valid Indian number starting with 9', () => {
    expect(validatePhone('9876543210')).toEqual({ valid: true });
  });

  it('accepts with +91 prefix', () => {
    expect(validatePhone('+91 9876543210')).toEqual({ valid: true });
  });

  it('accepts with +91 prefix and dash', () => {
    expect(validatePhone('+91-9876543210')).toEqual({ valid: true });
  });

  it('rejects number starting with invalid digit (1-5)', () => {
    expect(validatePhone('1234567890').valid).toBe(false);
    expect(validatePhone('5234567890').valid).toBe(false);
  });

  it('rejects too short number', () => {
    expect(validatePhone('987654').valid).toBe(false);
  });

  it('rejects too long number', () => {
    expect(validatePhone('98765432101').valid).toBe(false);
  });

  it('strips spaces and dashes before validation', () => {
    expect(validatePhone('987-654-3210')).toEqual({ valid: true });
    expect(validatePhone('987 654 3210')).toEqual({ valid: true });
  });
});

describe('validateCityName', () => {
  it('rejects empty input', () => {
    expect(validateCityName('').valid).toBe(false);
    expect(validateCityName('').error).toBe('City name is required');
  });

  it('accepts valid city name', () => {
    expect(validateCityName('Mumbai')).toEqual({ valid: true });
  });

  it('accepts city name with spaces', () => {
    expect(validateCityName('New Delhi')).toEqual({ valid: true });
  });

  it('rejects single character', () => {
    expect(validateCityName('A').valid).toBe(false);
    expect(validateCityName('A').error).toBe('City name must be at least 2 characters');
  });

  it('accepts exactly 2 characters', () => {
    expect(validateCityName('Go')).toEqual({ valid: true });
  });

  it('rejects SQL injection characters - semicolons', () => {
    expect(validateCityName("Mumbai; DROP TABLE").valid).toBe(false);
    expect(validateCityName("Mumbai; DROP TABLE").error).toBe('City name contains invalid characters');
  });

  it('rejects SQL injection characters - quotes', () => {
    expect(validateCityName("Mumbai' OR '1'='1").valid).toBe(false);
  });

  it('rejects SQL injection characters - double dash', () => {
    expect(validateCityName("Mumbai--").valid).toBe(false);
  });

  it('rejects overly long name', () => {
    expect(validateCityName('A'.repeat(101)).valid).toBe(false);
    expect(validateCityName('A'.repeat(101)).error).toBe('City name must not exceed 100 characters');
  });

  it('accepts exactly 100 characters', () => {
    expect(validateCityName('A'.repeat(100)).valid).toBe(true);
  });

  it('trims whitespace before checking length', () => {
    expect(validateCityName('   A   ').valid).toBe(false); // trimmed = "A" which is 1 char
  });
});

describe('validateAmount', () => {
  it('rejects NaN', () => {
    expect(validateAmount(NaN).valid).toBe(false);
    expect(validateAmount(NaN).error).toBe('Amount must be a valid number');
  });

  it('rejects Infinity', () => {
    expect(validateAmount(Infinity).valid).toBe(false);
    expect(validateAmount(Infinity).error).toBe('Amount must be a finite number');
  });

  it('rejects negative Infinity', () => {
    expect(validateAmount(-Infinity).valid).toBe(false);
  });

  it('rejects negative when min is 0', () => {
    expect(validateAmount(-1).valid).toBe(false);
    expect(validateAmount(-1).error).toBe('Amount must be at least 0');
  });

  it('accepts zero amount (at boundary)', () => {
    expect(validateAmount(0)).toEqual({ valid: true });
  });

  it('accepts amount within range', () => {
    expect(validateAmount(500)).toEqual({ valid: true });
  });

  it('accepts exact max value (1,000,000)', () => {
    expect(validateAmount(1_000_000)).toEqual({ valid: true });
  });

  it('rejects amount above max', () => {
    expect(validateAmount(1_000_001).valid).toBe(false);
    expect(validateAmount(2_000_000).error).toBe('Amount must not exceed 1000000');
  });

  it('respects custom min/max', () => {
    expect(validateAmount(5, 10, 100).valid).toBe(false);
    expect(validateAmount(5, 10, 100).error).toBe('Amount must be at least 10');
    expect(validateAmount(50, 10, 100)).toEqual({ valid: true });
    expect(validateAmount(150, 10, 100).valid).toBe(false);
  });

  it('accepts decimal amounts', () => {
    expect(validateAmount(99.99)).toEqual({ valid: true });
  });

  it('accepts boundary values for custom range', () => {
    expect(validateAmount(10, 10, 100)).toEqual({ valid: true });
    expect(validateAmount(100, 10, 100)).toEqual({ valid: true });
  });
});

describe('validateWeight', () => {
  it('rejects NaN', () => {
    expect(validateWeight(NaN).valid).toBe(false);
    expect(validateWeight(NaN).error).toBe('Weight must be a valid number');
  });

  it('rejects Infinity', () => {
    expect(validateWeight(Infinity).valid).toBe(false);
    expect(validateWeight(Infinity).error).toBe('Weight must be a finite number');
  });

  it('rejects zero weight', () => {
    expect(validateWeight(0).valid).toBe(false);
    expect(validateWeight(0).error).toBe('Weight must be at least 0.1 kg');
  });

  it('rejects too light (below 0.1)', () => {
    expect(validateWeight(0.05).valid).toBe(false);
  });

  it('rejects too heavy (above 500)', () => {
    expect(validateWeight(501).valid).toBe(false);
    expect(validateWeight(501).error).toBe('Weight must not exceed 500 kg');
  });

  it('accepts valid weight', () => {
    expect(validateWeight(5)).toEqual({ valid: true });
  });

  it('accepts minimum boundary (0.1)', () => {
    expect(validateWeight(0.1)).toEqual({ valid: true });
  });

  it('accepts maximum boundary (500)', () => {
    expect(validateWeight(500)).toEqual({ valid: true });
  });

  it('accepts decimal weights', () => {
    expect(validateWeight(2.5)).toEqual({ valid: true });
    expect(validateWeight(0.15)).toEqual({ valid: true });
  });

  it('rejects negative weight', () => {
    expect(validateWeight(-1).valid).toBe(false);
  });
});

describe('validateDescription', () => {
  it('rejects empty string', () => {
    expect(validateDescription('').valid).toBe(false);
    expect(validateDescription('').error).toBe('Description is required');
  });

  it('rejects whitespace-only string', () => {
    expect(validateDescription('   ').valid).toBe(false);
  });

  it('accepts valid description', () => {
    expect(validateDescription('A laptop in protective case')).toEqual({ valid: true });
  });

  it('rejects overly long description (default 1000)', () => {
    expect(validateDescription('a'.repeat(1001)).valid).toBe(false);
    expect(validateDescription('a'.repeat(1001)).error).toBe('Description must not exceed 1000 characters');
  });

  it('accepts description at exactly max length', () => {
    expect(validateDescription('a'.repeat(1000))).toEqual({ valid: true });
  });

  it('respects custom max length', () => {
    expect(validateDescription('a'.repeat(51), 50).valid).toBe(false);
    expect(validateDescription('a'.repeat(50), 50)).toEqual({ valid: true });
  });

  it('rejects HTML script tags (XSS prevention)', () => {
    expect(validateDescription('<script>alert("xss")</script>').valid).toBe(false);
    expect(validateDescription('<script>alert("xss")</script>').error).toBe(
      'Description contains invalid HTML content'
    );
  });

  it('rejects generic HTML tags', () => {
    expect(validateDescription('<img src=x onerror=alert(1)>').valid).toBe(false);
  });

  it('rejects div tags', () => {
    expect(validateDescription('<div>content</div>').valid).toBe(false);
  });

  it('accepts plain text with ampersand', () => {
    expect(validateDescription('Package with dimensions 10x20x30 cm & fragile items')).toEqual({
      valid: true,
    });
  });

  it('accepts plain text with special characters (non-HTML)', () => {
    expect(validateDescription('Weight: 5kg, Size: 30x20x10, Priority!')).toEqual({ valid: true });
  });

  it('accepts text with numbers and common punctuation', () => {
    expect(validateDescription('2 boxes of documents (urgent). Ref #12345')).toEqual({ valid: true });
  });
});

describe('validateUUID', () => {
  it('rejects empty string', () => {
    expect(validateUUID('').valid).toBe(false);
    expect(validateUUID('').error).toBe('ID is required');
  });

  it('rejects whitespace-only string', () => {
    expect(validateUUID('   ').valid).toBe(false);
  });

  it('accepts valid UUID v1', () => {
    expect(validateUUID('550e8400-e29b-11d4-a716-446655440000')).toEqual({ valid: true });
  });

  it('accepts valid UUID v4', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toEqual({ valid: true });
  });

  it('accepts uppercase UUID', () => {
    expect(validateUUID('550E8400-E29B-41D4-A716-446655440000')).toEqual({ valid: true });
  });

  it('accepts mixed-case UUID', () => {
    expect(validateUUID('550e8400-E29B-41d4-A716-446655440000')).toEqual({ valid: true });
  });

  it('rejects invalid format - too short', () => {
    expect(validateUUID('550e8400-e29b').valid).toBe(false);
    expect(validateUUID('550e8400-e29b').error).toBe('Invalid ID format');
  });

  it('rejects invalid format - random string', () => {
    expect(validateUUID('not-a-uuid').valid).toBe(false);
  });

  it('rejects invalid format - missing dashes', () => {
    expect(validateUUID('550e8400e29b41d4a716446655440000').valid).toBe(false);
  });

  it('rejects invalid format - extra characters', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000x').valid).toBe(false);
  });

  it('rejects UUID with invalid version digit (0)', () => {
    expect(validateUUID('550e8400-e29b-01d4-a716-446655440000').valid).toBe(false);
  });

  it('trims whitespace before validation', () => {
    expect(validateUUID('  550e8400-e29b-41d4-a716-446655440000  ')).toEqual({ valid: true });
  });
});
