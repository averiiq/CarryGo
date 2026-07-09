import { getSupabaseClient } from '@/template';
import { Parcel } from '@/types';
import { sanitizeLikeInput } from '@/lib/sanitize';

interface ParcelRow {
  id: string;
  user_id: string;
  user_name: string;
  from_city: string;
  to_city: string;
  category: string;
  description: string;
  weight: number | string;
  price_offer: number | string;
  status: string;
  image_url?: string;
  created_at: string;
}

function mapRow(row: ParcelRow): Parcel {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    fromCity: row.from_city,
    toCity: row.to_city,
    category: row.category as Parcel['category'],
    description: row.description,
    weight: parseFloat(String(row.weight)),
    priceOffer: parseFloat(String(row.price_offer)),
    status: row.status as Parcel['status'],
    imageUri: row.image_url,
    createdAt: row.created_at,
  };
}

export async function fetchParcels(filters?: { fromCity?: string; toCity?: string; limit?: number; offset?: number }) {
  const sb = getSupabaseClient();
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  let query = sb.from('parcels').select('*', { count: 'exact' }).in('status', ['open', 'matched']).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (filters?.fromCity) query = query.ilike('from_city', `%${sanitizeLikeInput(filters.fromCity)}%`);
  if (filters?.toCity) query = query.ilike('to_city', `%${sanitizeLikeInput(filters.toCity)}%`);
  const { data, error, count } = await query;
  if (error) return { data: null, error: error.message, total: 0 };
  return { data: (data || []).map(mapRow), error: null, total: count ?? 0 };
}

export async function fetchParcelById(parcelId: string) {
  const sb = getSupabaseClient();
  const { data, error } = await sb.from('parcels').select('*').eq('id', parcelId).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data), error: null };
}

export async function fetchParcelsByIds(parcelIds: string[]) {
  if (parcelIds.length === 0) return { data: [], error: null };
  const sb = getSupabaseClient();
  const { data, error } = await sb.from('parcels').select('*').in('id', parcelIds);
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(mapRow), error: null };
}

export async function createParcel(parcel: Omit<Parcel, 'id' | 'createdAt'>) {
  const sb = getSupabaseClient();
  const { data, error } = await sb.from('parcels').insert({
    user_id: parcel.userId,
    user_name: parcel.userName,
    from_city: parcel.fromCity,
    to_city: parcel.toCity,
    category: parcel.category,
    description: parcel.description,
    weight: parcel.weight,
    price_offer: parcel.priceOffer,
    status: parcel.status,
    image_url: parcel.imageUri,
  }).select().single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data), error: null };
}

export async function updateParcelStatus(parcelId: string, status: Parcel['status']) {
  const sb = getSupabaseClient();
  const { error } = await sb.from('parcels').update({ status }).eq('id', parcelId);
  if (error) return { error: error.message };
  return { error: null };
}
