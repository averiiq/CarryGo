import { describe, it, expect } from 'vitest';
import { isValidUuid } from '@/lib/validation';

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
