import { describe, it, expect } from 'vitest';
import { isValidUuid, parsePositiveInt, sanitizeText } from '@/lib/validation';

describe('isValidUuid', () => {
  it('returns true for a valid lowercase UUID', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns true for a valid uppercase UUID', () => {
    expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('returns true for mixed-case UUID', () => {
    expect(isValidUuid('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('returns false for a non-string value', () => {
    expect(isValidUuid(123)).toBe(false);
    expect(isValidUuid(null)).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
    expect(isValidUuid({})).toBe(false);
  });

  it('returns false for a string with wrong length', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
  });

  it('returns false for a UUID missing hyphens', () => {
    expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false);
  });

  it('returns false for a string with invalid characters', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-44665544zzzz')).toBe(false);
  });

  it('returns false for a UUID with extra characters', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000x')).toBe(false);
  });
});

describe('sanitizeText', () => {
  it('returns the trimmed string for normal input', () => {
    expect(sanitizeText('  hello world  ')).toBe('hello world');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeText(123)).toBe('');
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText({})).toBe('');
    expect(sanitizeText([])).toBe('');
  });

  it('returns empty string for an empty string', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('truncates text to the default maxLength of 500', () => {
    const longText = 'a'.repeat(600);
    const result = sanitizeText(longText);
    expect(result.length).toBe(500);
  });

  it('truncates text to a custom maxLength', () => {
    const text = 'hello world';
    const result = sanitizeText(text, 5);
    expect(result).toBe('hello');
  });

  it('preserves special characters within the length limit', () => {
    const text = '<script>alert("xss")</script>';
    expect(sanitizeText(text)).toBe('<script>alert("xss")</script>');
  });

  it('handles strings with only whitespace', () => {
    expect(sanitizeText('   ')).toBe('');
  });

  it('trims after truncation', () => {
    // If truncation cuts at a space, trim should remove trailing space
    const text = 'abc  ';
    const result = sanitizeText(text, 4);
    expect(result).toBe('abc');
  });

  it('handles unicode characters', () => {
    const text = 'Hello \u{1F600} World';
    expect(sanitizeText(text)).toBe('Hello \u{1F600} World');
  });
});

describe('parsePositiveInt', () => {
  it('returns parsed positive integer for valid numeric string', () => {
    expect(parsePositiveInt('7')).toBe(7);
  });

  it('returns fallback for zero, negative, or invalid values', () => {
    expect(parsePositiveInt('0')).toBe(1);
    expect(parsePositiveInt('-5')).toBe(1);
    expect(parsePositiveInt('abc')).toBe(1);
    expect(parsePositiveInt(undefined)).toBe(1);
  });

  it('supports custom fallback value', () => {
    expect(parsePositiveInt('invalid', 3)).toBe(3);
  });
});
