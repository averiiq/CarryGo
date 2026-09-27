'use server'

import { requireAdmin } from '@/utils/admin-guard'
import { revalidatePath } from 'next/cache'

export interface BannerInput {
  type: 'urgent' | 'corridor' | 'kyc' | 'announcement' | 'discount'
  badge_text: string
  badge_color: string
  title: string
  subtitle: string
  cta_text: string
  cta_action: 'create_parcel' | 'create_trip' | 'open_kyc' | 'matching' | 'link' | 'none'
  deep_link?: string | null
  image_url?: string | null
  display_order?: number
  is_active?: boolean
}

export async function createPromotionalBanner(input: BannerInput) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const { supabase, userId } = auth

  const title = input.title?.trim()
  const subtitle = input.subtitle?.trim()
  const badgeText = input.badge_text?.trim()

  if (!title || title.length < 3) return { error: 'Title must be at least 3 characters.' }
  if (!subtitle || subtitle.length < 5) return { error: 'Subtitle must be at least 5 characters.' }
  if (!badgeText) return { error: 'Badge text is required.' }

  const { data, error } = await supabase
    .from('promotional_banners')
    .insert({
      type: input.type || 'urgent',
      badge_text: badgeText,
      badge_color: input.badge_color || '#F59E0B',
      title,
      subtitle,
      cta_text: input.cta_text?.trim() || 'Learn More',
      cta_action: input.cta_action || 'create_parcel',
      deep_link: input.deep_link?.trim() || null,
      image_url: input.image_url?.trim() || null,
      display_order: Number(input.display_order ?? 0),
      is_active: input.is_active ?? true,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    return { error: `Failed to create banner: ${error.message}` }
  }

  revalidatePath('/dashboard/banners')
  return { data }
}

export async function updatePromotionalBanner(id: string, input: Partial<BannerInput>) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const { supabase } = auth

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) {
    if (!input.title.trim() || input.title.trim().length < 3) {
      return { error: 'Title must be at least 3 characters.' }
    }
    updates.title = input.title.trim()
  }

  if (input.subtitle !== undefined) {
    if (!input.subtitle.trim() || input.subtitle.trim().length < 5) {
      return { error: 'Subtitle must be at least 5 characters.' }
    }
    updates.subtitle = input.subtitle.trim()
  }

  if (input.badge_text !== undefined) updates.badge_text = input.badge_text.trim()
  if (input.badge_color !== undefined) updates.badge_color = input.badge_color.trim()
  if (input.type !== undefined) updates.type = input.type
  if (input.cta_text !== undefined) updates.cta_text = input.cta_text.trim()
  if (input.cta_action !== undefined) updates.cta_action = input.cta_action
  if (input.deep_link !== undefined) updates.deep_link = input.deep_link?.trim() || null
  if (input.image_url !== undefined) updates.image_url = input.image_url?.trim() || null
  if (input.display_order !== undefined) updates.display_order = Number(input.display_order)
  if (input.is_active !== undefined) updates.is_active = Boolean(input.is_active)

  const { data, error } = await supabase
    .from('promotional_banners')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: `Failed to update banner: ${error.message}` }
  }

  revalidatePath('/dashboard/banners')
  return { data }
}

export async function togglePromotionalBannerActive(id: string, isActive: boolean) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const { supabase } = auth

  const { error } = await supabase
    .from('promotional_banners')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { error: `Failed to toggle banner: ${error.message}` }
  }

  revalidatePath('/dashboard/banners')
  return { success: true }
}

export async function deletePromotionalBanner(id: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const { supabase } = auth

  const { error } = await supabase
    .from('promotional_banners')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `Failed to delete banner: ${error.message}` }
  }

  revalidatePath('/dashboard/banners')
  return { success: true }
}

export async function reorderPromotionalBanners(orderedIds: string[]) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const { supabase } = auth

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('promotional_banners')
      .update({ display_order: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  )

  await Promise.all(updates)
  revalidatePath('/dashboard/banners')
  return { success: true }
}
