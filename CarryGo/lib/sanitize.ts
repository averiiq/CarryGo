const MAX_INPUT_LENGTH = 200;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Encodes HTML special characters to prevent XSS when rendering user input.
 * The ampersand replacement must come first to avoid double-encoding.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitizes text intended for display by trimming, truncating, and HTML-encoding.
 */
export function sanitizeForDisplay(value: string, maxLength = 1000): string {
  return escapeHtml(value.slice(0, maxLength).trim());
}

export function sanitizeLikeInput(value: string): string {
  const trimmed = value.slice(0, MAX_INPUT_LENGTH);
  return trimmed.replace(/[%_\\]/g, '\\$&');
}

export function sanitizeTextInput(value: string, maxLength = 1000): string {
  return value.slice(0, maxLength).trim();
}

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function sanitizeMessageText(text: string): string {
  return text
    .slice(0, 5000)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}
