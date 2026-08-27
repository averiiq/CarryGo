import { getSupabaseClient } from '@/template';
import { Rating } from '@/types';
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
}) {
  if (rating.rating < 1 || rating.rating > 5 || !Number.isInteger(rating.rating)) {
    return { data: null, error: 'Rating must be an integer between 1 and 5' };
  }

  const comment = rating.comment ? sanitizeTextInput(rating.comment, 500) : null;

  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc('submit_rating_command', {
    p_request_id: rating.requestId,
    p_to_user_id: rating.toUserId,
    p_rating: rating.rating,
    p_comment: comment || undefined,
  }).single();
  if (error) return { data: null, error: error.message };
  return { data: mapRow(data as unknown as RatingRow), error: null };
}

export async function hasRated(fromUserId: string, requestId: string): Promise<boolean> {
  const sb = getSupabaseClient();
  const { data } = await sb.from('ratings').select('id').eq('from_user_id', fromUserId).eq('request_id', requestId).single();
  return !!data;
}
