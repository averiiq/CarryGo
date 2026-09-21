import { getSupabaseClient } from '@/template';

export async function requestAccountDeletion(): Promise<{ error: string | null }> {
  const sb = getSupabaseClient();

  const { data, error } = await sb.rpc('soft_delete_user_account');

  if (error) {
    return { error: error.message ?? 'Unable to delete account right now.' };
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return { error: String(data.error) };
  }

  return { error: null };
}
