'use server'

import { requireAdmin } from '@/utils/admin-guard'
import { revalidatePath } from 'next/cache'

export type BroadcastAudience =
  | { type: 'all' }
  | { type: 'role'; role: 'sender' | 'traveller' | 'both' }
  | { type: 'city'; city: string }

export interface SendBroadcastInput {
  title: string
  body: string
  category: 'broadcast' | 'promotion' | 'system_alert'
  priority: 'low' | 'normal' | 'high' | 'critical'
  deepLink?: string
  imageUrl?: string
  audience: BroadcastAudience
}

export async function sendAdminBroadcast(input: SendBroadcastInput) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const { supabase, userId } = auth

  // Validate
  const title = input.title?.trim()
  const body = input.body?.trim()
  if (!title || title.length < 3) return { error: 'Title must be at least 3 characters.' }
  if (!body || body.length < 5) return { error: 'Body must be at least 5 characters.' }
  if (title.length > 100) return { error: 'Title must be 100 characters or fewer.' }
  if (body.length > 500) return { error: 'Body must be 500 characters or fewer.' }

  // Get target user IDs
  let userQuery = supabase.from('user_profiles').select('id').eq('is_deleted', false)
  if (input.audience.type === 'role') {
    userQuery = userQuery.in('role', [input.audience.role, 'both'])
  } else if (input.audience.type === 'city') {
    userQuery = userQuery.eq('city', input.audience.city)
  }

  const { data: targetUsers, error: userError } = await userQuery
  if (userError) return { error: `Failed to load recipients: ${userError.message}` }
  if (!targetUsers || targetUsers.length === 0) return { error: 'No users match this audience.' }

  // Create broadcast record
  const { data: broadcast, error: broadcastError } = await supabase
    .from('admin_broadcasts')
    .insert({
      created_by: userId,
      title,
      body,
      image_url: input.imageUrl || null,
      deep_link: input.deepLink || null,
      priority: input.priority,
      category: input.category,
      target_audience: input.audience,
      total_targeted: targetUsers.length,
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (broadcastError || !broadcast) return { error: `Failed to create broadcast: ${broadcastError?.message}` }

  // Emit outbox events for each recipient (batch in chunks of 50)
  const chunkSize = 50
  let totalSent = 0
  for (let i = 0; i < targetUsers.length; i += chunkSize) {
    const chunk = targetUsers.slice(i, i + chunkSize)
    const events = chunk.map((u) => ({
      actor_id: userId,
      entity_type: 'admin_broadcast',
      entity_id: broadcast.id,
      event_name: 'admin_broadcast',
      topic: 'admin.broadcast',
      payload: {
        recipient_id: u.id,
        broadcast_id: broadcast.id,
        title,
        body,
        category: input.category,
        priority: input.priority,
        deep_link: input.deepLink || null,
        image_url: input.imageUrl || null,
      },
    }))
    const { error: emitError } = await supabase.from('outbox_events').insert(events)
    if (!emitError) totalSent += chunk.length
  }

  // Update sent count
  await supabase
    .from('admin_broadcasts')
    .update({ total_sent: totalSent })
    .eq('id', broadcast.id)

  revalidatePath('/dashboard/notifications')

  return { success: true, broadcastId: broadcast.id, totalSent }
}

export async function getBroadcastHistory(limit = 20) {
  const auth = await requireAdmin()
  if ('error' in auth) return { data: null, error: auth.error }
  const { supabase } = auth

  const { data, error } = await supabase
    .from('admin_broadcasts')
    .select('id, title, body, category, priority, target_audience, total_targeted, total_sent, sent_at, created_at, created_by')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

