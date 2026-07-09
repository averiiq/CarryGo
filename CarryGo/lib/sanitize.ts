const MAX_INPUT_LENGTH = 200;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
