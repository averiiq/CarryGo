export const parseJsonBody = <T>(rawBody?: string | null): T | null => {
  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    return null;
  }
};

export const parseIntParam = (
  rawValue: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number => {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
};

