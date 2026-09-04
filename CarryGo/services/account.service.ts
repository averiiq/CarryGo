import { getSupabaseClient } from '@/template';

export async function requestAccountDeletion(): Promise<{ error: string | null }> {
  const sb = getSupabaseClient();

  const { data, error } = await sb.functions.invoke('delete-account', {
    body: {},
  });

  if (error) {
    return { error: error.message ?? 'Unable to delete account right now.' };
  }

  if (data?.error) {
    return { error: String(data.error) };
  }

  return { error: null };
}
