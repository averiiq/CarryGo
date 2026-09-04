import { getSupabaseClient } from '@/template';
import { getUnmatchedListingCutoffIso } from '@/constants/listingFlow';

type ExpiryResult = {
  expiredTrips?: number;
  expiredParcels?: number;
};

function isMissingFunctionError(message: string | null | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('does not exist') || normalized.includes('could not find the function');
}

export async function expireStaleUnmatchedListings(cutoffIso = getUnmatchedListingCutoffIso()): Promise<ExpiryResult> {
  const sb = getSupabaseClient();
  const { data, error } = await (sb as any).rpc('expire_stale_unmatched_listings', { p_cutoff: cutoffIso });

  if (error) {
    if (isMissingFunctionError(error.message)) {
      return {};
    }
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return {};

  const record = row as Record<string, unknown>;
  return {
    expiredTrips: typeof record.expired_trips === 'number' ? record.expired_trips : undefined,
    expiredParcels: typeof record.expired_parcels === 'number' ? record.expired_parcels : undefined,
  };
}
