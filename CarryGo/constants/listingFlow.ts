export const UNMATCHED_LISTING_EXPIRY_HOURS = 24;

const HOUR_IN_MS = 60 * 60 * 1000;

export function getUnmatchedListingCutoffIso(nowMs: number = Date.now()) {
  return new Date(nowMs - UNMATCHED_LISTING_EXPIRY_HOURS * HOUR_IN_MS).toISOString();
}

export function isUnmatchedListingExpired(createdAt: string, nowMs: number = Date.now()) {
  const createdAtMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdAtMs)) return false;
  return nowMs - createdAtMs >= UNMATCHED_LISTING_EXPIRY_HOURS * HOUR_IN_MS;
}
