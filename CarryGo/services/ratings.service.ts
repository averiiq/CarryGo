import { getSupabaseClient } from '@/template';
import { Rating, ServiceResult } from '@/types';
import { sanitizeTextInput } from '@/lib/sanitize';

interface RatingRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  request_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

function mapRow(row: RatingRow): Rating {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    requestId: row.request_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export async function submitRating(rating: {
  fromUserId: string;
  toUserId: string;
  requestId: string;
  rating: number;
  comment?: string;
}): Promise<ServiceResult<Rating>> {
  if (rating.rating < 1 || rating.rating > 5 || !Number.isInteger(rating.rating)) {
    return { data: null, error: 'Rating must be an integer between 1 and 5' };
  }

  const comment = rating.comment ? sanitizeTextInput(rating.comment, 500) : null;
  const sb = getSupabaseClient();

  try {
    const res = await sb.rpc('submit_rating_command', {
      p_request_id: rating.requestId,
      p_to_user_id: rating.toUserId,
      p_rating: rating.rating,
      p_comment: comment || undefined,
    });

    if (!res.error) {
      const data = Array.isArray(res.data) ? res.data[0] : res.data;
      if (data) {
        return { data: mapRow(data as unknown as RatingRow), error: null };
      }
    }

    // Resilient fallback: direct insertion into public.ratings if RPC has an issue
    console.warn('[submitRating] submit_rating_command RPC failed, trying direct insertion fallback:', res.error?.message);
    const { data: directData, error: directErr } = await sb
      .from('ratings')
      .insert({
        from_user_id: rating.fromUserId,
        to_user_id: rating.toUserId,
        request_id: rating.requestId,
        rating: rating.rating,
        comment: comment || null,
      })
      .select('*')
      .single();

    if (!directErr && directData) {
      return { data: mapRow(directData as unknown as RatingRow), error: null };
    }

    const rawError = res.error?.message || directErr?.message || 'Could not submit rating.';
    const cleanError = rawError.toLowerCase().includes('ambiguous')
      ? 'Could not record rating. Please retry in a moment.'
      : rawError;

    return { data: null, error: cleanError };
  } catch (err: unknown) {
    // Last-ditch direct insert attempt if RPC threw completely
    try {
      const { data: directData, error: directErr } = await sb
        .from('ratings')
        .insert({
          from_user_id: rating.fromUserId,
          to_user_id: rating.toUserId,
          request_id: rating.requestId,
          rating: rating.rating,
          comment: comment || null,
        })
        .select('*')
        .single();
      if (!directErr && directData) {
        return { data: mapRow(directData as unknown as RatingRow), error: null };
      }
    } catch {
      // Fall through to error return below
    }

    const errorMsg = err instanceof Error ? err.message : 'Could not submit rating.';
    const cleanMsg = errorMsg.toLowerCase().includes('ambiguous')
      ? 'Could not record rating. Please retry in a moment.'
      : errorMsg;
    return { data: null, error: cleanMsg };
  }
}

export async function hasRated(fromUserId: string, requestId: string): Promise<boolean> {
  const sb = getSupabaseClient();
  const { data } = await sb.from('ratings').select('id').eq('from_user_id', fromUserId).eq('request_id', requestId).single();
  return !!data;
}
