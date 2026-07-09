const DATE_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
const DATETIME_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
const TIME_OPTS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
const LOCALE = 'en-IN';

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(LOCALE, DATE_OPTS);
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString(LOCALE, DATETIME_OPTS);
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString(LOCALE, TIME_OPTS);
}

export function formatRelative(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;

  if (diffMs < 60_000) return 'Just now';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  if (diffMs < 604_800_000) return `${Math.floor(diffMs / 86_400_000)}d ago`;
  return formatDate(date);
}
