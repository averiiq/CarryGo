/**
 * Input validation utilities for the CarryGo mobile app.
 * All validators return { valid: boolean; error?: string }.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const INDIAN_PHONE_REGEX = /^(\+91[-\s]?)?[6-9]\d{9}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SQL_INJECTION_CHARS = /[;'"\%\-\-\/\*]/;

export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address is too long' };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
}

export function validatePhone(phone: string): ValidationResult {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, error: 'Phone number is required' };
  }

  const cleaned = phone.replace(/[\s-]/g, '');

  if (!INDIAN_PHONE_REGEX.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid Indian phone number' };
  }

  return { valid: true };
}

export function validateCityName(city: string): ValidationResult {
  if (!city || city.trim().length === 0) {
    return { valid: false, error: 'City name is required' };
  }

  const trimmed = city.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'City name must be at least 2 characters' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'City name must not exceed 100 characters' };
  }

  if (SQL_INJECTION_CHARS.test(trimmed)) {
    return { valid: false, error: 'City name contains invalid characters' };
  }

  return { valid: true };
}

export function validateAmount(
  amount: number,
  min: number = 0,
  max: number = 1_000_000
): ValidationResult {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (!isFinite(amount)) {
    return { valid: false, error: 'Amount must be a finite number' };
  }

  if (amount < min) {
    return { valid: false, error: `Amount must be at least ${min}` };
  }

  if (amount > max) {
    return { valid: false, error: `Amount must not exceed ${max}` };
  }

  return { valid: true };
}

export function validateWeight(weight: number): ValidationResult {
  if (weight === null || weight === undefined || isNaN(weight)) {
    return { valid: false, error: 'Weight must be a valid number' };
  }

  if (!isFinite(weight)) {
    return { valid: false, error: 'Weight must be a finite number' };
  }

  if (weight < 0.1) {
    return { valid: false, error: 'Weight must be at least 0.1 kg' };
  }

  if (weight > 500) {
    return { valid: false, error: 'Weight must not exceed 500 kg' };
  }

  return { valid: true };
}

export function validateDescription(
  text: string,
  maxLength: number = 1000
): ValidationResult {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Description is required' };
  }

  const trimmed = text.trim();

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Description must not exceed ${maxLength} characters` };
  }

  const sanitized = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '');

  if (sanitized.length !== trimmed.length) {
    return { valid: false, error: 'Description contains invalid HTML content' };
  }

  return { valid: true };
}

export function validateUUID(id: string): ValidationResult {
  if (!id || id.trim().length === 0) {
    return { valid: false, error: 'ID is required' };
  }

  if (!UUID_REGEX.test(id.trim())) {
    return { valid: false, error: 'Invalid ID format' };
  }

  return { valid: true };
}
