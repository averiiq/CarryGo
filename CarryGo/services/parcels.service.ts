import { getSupabaseClient } from '@/template';
import { Parcel } from '@/types';
import type { Database } from '@/types/database';
import { sanitizeLikeInput } from '@/lib/sanitize';
import { enforceRateLimit } from '@/lib/server-rate-limit';
import { isAwsBackendEnabled } from '@/lib/backend/provider';
import { awsApiRequest, AwsApiError } from '@/lib/aws/api';
import { getUnmatchedListingCutoffIso } from '@/constants/listingFlow';
import { expireStaleUnmatchedListings } from '@/services/listing-expiry.service';

type ParcelRow = Database['public']['Tables']['parcels']['Row'];

function parseImageUris(raw: string | null): string[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [raw];
}

function mapRow(row: ParcelRow): Parcel {
  const imageUris = parseImageUris(row.image_url);
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    fromCity: row.from_city,
    toCity: row.to_city,
    category: row.category as Parcel['category'],
    description: row.description,
    deliveryDate: row.delivery_date ?? undefined,
    weight: Number(row.weight),
    priceOffer: Number(row.price_offer),
    status: row.status as Parcel['status'],
    imageUri: imageUris?.[0] ?? undefined,
    imageUris,
    createdAt: row.created_at,
  };
}

export async function fetchParcels(filters?: { fromCity?: string; toCity?: string; userCity?: string; limit?: number; offset?: number }) {
  if (isAwsBackendEnabled()) {
    try {
      const limit = filters?.limit ?? 50;
      const offset = filters?.offset ?? 0;
      const query = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (filters?.fromCity) query.set('fromCity', filters.fromCity);
      if (filters?.toCity) query.set('toCity', filters.toCity);
      if (filters?.userCity) query.set('userCity', filters.userCity);

      const response = await awsApiRequest<{ data: Parcel[]; total: number }>(`/parcels?${query.toString()}`);
      return { data: response.data, error: null, total: response.total };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to fetch parcels';
      return { data: null, error: message, total: 0 };
    }
  }

  const sb = getSupabaseClient();
  try {
    await expireStaleUnmatchedListings();
  } catch {
    // Non-blocking cleanup. Listing fetch should still proceed.
  }
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  let query = sb
    .from('parcels')
    .select('*', { count: 'exact' })
    .eq('status', 'open')
    .gte('created_at', getUnmatchedListingCutoffIso())
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (filters?.fromCity) query = query.ilike('from_city', `%${sanitizeLikeInput(filters.fromCity)}%`);
  if (filters?.toCity) query = query.ilike('to_city', `%${sanitizeLikeInput(filters.toCity)}%`);
  if (filters?.userCity && !filters.fromCity && !filters.toCity) {
    const city = sanitizeLikeInput(filters.userCity);
    query = query.or(`from_city.ilike.%${city}%,to_city.ilike.%${city}%`);
  }
  const { data, error, count } = await query;
  if (error) return { data: null, error: error.message, total: 0 };
  return { data: (data || []).map(mapRow), error: null, total: count ?? 0 };
}

export async function fetchParcelById(parcelId: string) {
  if (isAwsBackendEnabled()) {
    try {
      const response = await awsApiRequest<{ data: Parcel }>(`/parcels/${parcelId}`);
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to fetch parcel';
      return { data: null, error: message };
    }
  }

  const sb = getSupabaseClient();
  const { data, error } = await sb.from('parcels').select('*').eq('id', parcelId).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data), error: null };
}

export async function fetchParcelsByIds(parcelIds: string[]) {
  if (parcelIds.length === 0) return { data: [], error: null };

  if (isAwsBackendEnabled()) {
    try {
      const results = await Promise.all(parcelIds.map((parcelId) => awsApiRequest<{ data: Parcel }>(`/parcels/${parcelId}`)));
      return { data: results.map((entry) => entry.data), error: null };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to fetch parcel list';
      return { data: null, error: message };
    }
  }

  const sb = getSupabaseClient();
  const { data, error } = await sb.from('parcels').select('*').in('id', parcelIds);
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(mapRow), error: null };
}

export async function createParcel(parcel: Omit<Parcel, 'id' | 'createdAt'>) {
  if (!parcel.userId) return { data: null, error: 'User ID is required.' };

  if (!parcel.fromCity || !parcel.toCity) return { data: null, error: 'Origin and destination cities are required.' };
  if (parcel.weight <= 0) return { data: null, error: 'Parcel weight must be greater than zero.' };
  if (parcel.priceOffer < 0) return { data: null, error: 'Price offer cannot be negative.' };
  if (!parcel.description) return { data: null, error: 'Description is required.' };

  if (isAwsBackendEnabled()) {
    try {
      const response = await awsApiRequest<{ data: Parcel }>('/parcels', {
        method: 'POST',
        body: parcel,
      });
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to create parcel';
      return { data: null, error: message };
    }
  }

  const rateCheck = await enforceRateLimit(parcel.userId, 'create_parcel');
  if (!rateCheck.allowed) {
    return { data: null, error: rateCheck.error ?? 'Rate limit exceeded. Please try again later.' };
  }

  const sb = getSupabaseClient();
  const imageUrl = parcel.imageUris && parcel.imageUris.length > 0
    ? JSON.stringify(parcel.imageUris)
    : parcel.imageUri ?? null;
  const { data, error } = await sb.from('parcels').insert({
    user_id: parcel.userId,
    user_name: parcel.userName,
    from_city: parcel.fromCity,
    to_city: parcel.toCity,
    category: parcel.category,
    description: parcel.description,
    delivery_date: parcel.deliveryDate,
    weight: parcel.weight,
    price_offer: parcel.priceOffer,
    status: parcel.status as any,
    image_url: imageUrl,
  }).select().single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data), error: null };
}

export async function updateParcelStatus(parcelId: string, status: Parcel['status'], userId: string) {
  if (isAwsBackendEnabled()) {
    try {
      await awsApiRequest<{ error: null }>(`/parcels/${parcelId}/status`, {
        method: 'PATCH',
        body: { status, userId },
      });
      return { error: null };
    } catch (error) {
      const message = error instanceof AwsApiError ? error.message : 'Failed to update parcel status';
      return { error: message };
    }
  }

  const sb = getSupabaseClient();

  const { data: { user } } = await sb.auth.getUser();
  if (!user || user.id !== userId) return { error: 'Unauthorized' };
  const { error } = await sb.rpc('set_parcel_status', { p_parcel_id: parcelId, p_status: status });
  if (error) return { error: error.message };
  return { error: null };
}
