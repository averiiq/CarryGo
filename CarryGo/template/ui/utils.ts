import { AlertButton, AlertType } from './types';

/**
 * Intelligent type detection based on keywords, messages, and button styles.
 */
export function detectAlertType(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  explicitType?: AlertType
): 'success' | 'destructive' | 'error' | 'warning' | 'info' {
  if (explicitType && explicitType !== 'auto') {
    return explicitType;
  }

  // If any button has style 'destructive', treat as destructive
  if (buttons?.some(b => b.style === 'destructive')) {
    return 'destructive';
  }

  const combined = `${title || ''} ${message || ''}`.toLowerCase();

  // Destructive keywords
  if (/\b(delete|remove|cancel trip|reject|deactivate|discard|erase|leave)\b/.test(combined)) {
    return 'destructive';
  }

  // Error keywords
  if (/\b(error|fail|failed|failure|wrong|unable|invalid|denied|could not|not allowed)\b/.test(combined)) {
    return 'error';
  }

  // Success keywords
  if (/\b(success|accepted|created|saved|updated|verified|sent|copied|complete|confirmed|matched)\b/.test(combined)) {
    return 'success';
  }

  // Warning keywords
  if (/\b(warning|caution|alert|required|needed|permission|please check|sign in|attention|select)\b/.test(combined)) {
    return 'warning';
  }

  return 'info';
}
