import { sanitizeLikeInput, sanitizeTextInput, isValidUuid, sanitizeMessageText } from '@/lib/sanitize';

describe('sanitizeLikeInput', () => {
  it('escapes percent sign', () => {
    expect(sanitizeLikeInput('100%')).toBe('100\\%');
  });

  it('escapes underscore', () => {
    expect(sanitizeLikeInput('user_name')).toBe('user\\_name');
  });

  it('escapes backslash', () => {
    expect(sanitizeLikeInput('path\\to')).toBe('path\\\\to');
  });

  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeLikeInput(long).length).toBe(200);
  });

  it('passes through safe strings unchanged', () => {
    expect(sanitizeLikeInput('Mumbai')).toBe('Mumbai');
  });
});

describe('sanitizeTextInput', () => {
  it('trims whitespace', () => {
    expect(sanitizeTextInput('  hello  ')).toBe('hello');
  });

  it('truncates to max length', () => {
    const long = 'a'.repeat(2000);
    expect(sanitizeTextInput(long).length).toBe(1000);
  });

  it('respects custom max length', () => {
    expect(sanitizeTextInput('hello world', 5)).toBe('hello');
  });
});

describe('isValidUuid', () => {
  it('accepts valid UUID', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('rejects random string', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });
});

describe('sanitizeMessageText', () => {
  it('removes control characters', () => {
    expect(sanitizeMessageText('hello\x00world')).toBe('helloworld');
  });

  it('truncates to 5000 characters', () => {
    const long = 'a'.repeat(6000);
    expect(sanitizeMessageText(long).length).toBe(5000);
  });

  it('trims whitespace', () => {
    expect(sanitizeMessageText('  hello  ')).toBe('hello');
  });

  it('preserves newlines and tabs', () => {
    expect(sanitizeMessageText('line1\nline2\ttab')).toBe('line1\nline2\ttab');
  });
});
