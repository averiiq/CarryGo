import { getSupabaseClient } from '@/template';
import { PromotionalBanner } from '@/types';

const VALID_CTA_ACTIONS = new Set([
  'create_parcel', 'create_trip', 'search', 'my_activity', 'subscribe', 'refer',
]);

const ALLOWED_DEEP_LINK_PREFIXES = [
  '/', '/search', '/create-parcel', '/create-trip', '/my-activity',
  '/trip/', '/parcel/', '/payment/', '/profile', '/settings',
];

function sanitizeDeepLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  // Only allow internal relative routes
  if (!trimmed.startsWith('/')) return null;
  if (ALLOWED_DEEP_LINK_PREFIXES.some(p => trimmed === p || trimmed.startsWith(p))) {
    return trimmed;
  }
  return null;
}

export async function fetchActivePromotionalBanners(): Promise<{
  data: PromotionalBanner[];
  error: string | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    const { data, error } = await (supabase as any)
      .from('promotional_banners')
      .select('id, type, badge_text, badge_color, title, subtitle, cta_text, cta_action, deep_link, image_url, display_order, is_active, starts_at, ends_at, created_at, updated_at')
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    const banners: PromotionalBanner[] = (data || []).map((row: any) => ({
      id: row.id,
      type: row.type || 'urgent',
      badge_text: row.badge_text || '',
      badge_color: row.badge_color || '#F59E0B',
      title: row.title || '',
      subtitle: row.subtitle || '',
      cta_text: row.cta_text || 'Learn More',
      cta_action: VALID_CTA_ACTIONS.has(row.cta_action) ? row.cta_action : 'create_parcel',
      deep_link: sanitizeDeepLink(row.deep_link),
      image_url: row.image_url || null,
      display_order: Number(row.display_order ?? 0),
      is_active: Boolean(row.is_active),
      starts_at: row.starts_at || null,
      ends_at: row.ends_at || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return { data: banners, error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Failed to fetch promotional banners' };
  }
}
