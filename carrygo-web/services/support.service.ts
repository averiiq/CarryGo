/**
 * Support service (web) — ports CarryGo/services/support.service.ts
 * for in-app ticket submission against `support_tickets` table.
 */

import { createClient } from '@/utils/supabase/client'

export type ServiceResult<T> = { data: T; error: null } | { data: null; error: string }

export type SupportTicketCategory =
  | 'delivery_issue'
  | 'payment_refund'
  | 'kyc_account'
  | 'safety_conduct'
  | 'technical_bug'
  | 'general'

export const SUPPORT_CATEGORIES: Record<
  SupportTicketCategory,
  { label: string; description: string }
> = {
  delivery_issue: {
    label: 'Delivery Issue',
    description: 'Delays, missed pickup, OTP issues, or damaged goods',
  },
  payment_refund: {
    label: 'Payment & Refund',
    description: 'Booking payout delay, refund query, or pricing dispute',
  },
  kyc_account: {
    label: 'KYC & Account',
    description: 'Verification review status, document re-upload, or profile edit',
  },
  safety_conduct: {
    label: 'Safety & Conduct',
    description: 'Report suspicious behavior, prohibited items, or harassment',
  },
  technical_bug: {
    label: 'App Bug / Technical',
    description: 'Crash, glitches, notification issues, or UI error',
  },
  general: {
    label: 'General Inquiry',
    description: 'Questions about rules, how CaryGoo works, or feedback',
  },
}

export interface SupportTicket {
  id: string
  userId: string
  subject: string
  description: string
  status: 'open' | 'pending' | 'resolved' | 'closed' | string
  createdAt: string
  updatedAt: string
}

interface Row {
  id: string
  user_id: string
  subject: string
  description: string
  status: string
  created_at: string
  updated_at: string
}

function mapRow(row: Row): SupportTicket {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function sanitize(text: string, max: number): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, max)
}

export async function createSupportTicket(params: {
  subject: string
  description: string
  category: SupportTicketCategory
}): Promise<ServiceResult<SupportTicket>> {
  const subject = sanitize(params.subject, 160)
  const description = sanitize(params.description, 2000)
  if (subject.length < 4) return { data: null, error: 'Subject is too short.' }
  if (description.length < 10)
    return { data: null, error: 'Please describe the issue in more detail (10+ characters).' }

  const sb = createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return { data: null, error: 'Please sign in to submit a ticket.' }

  const categoryLabel = SUPPORT_CATEGORIES[params.category]?.label ?? 'General Inquiry'
  const formattedSubject = `[${categoryLabel}] ${subject}`

  const { data, error } = await sb
    .from('support_tickets')
    .insert({
      user_id: user.id,
      subject: formattedSubject,
      description,
      status: 'open',
    })
    .select('*')
    .single()

  if (error) return { data: null, error: error.message || 'Failed to submit ticket.' }
  return { data: mapRow(data as Row), error: null }
}

export async function getUserSupportTickets(): Promise<ServiceResult<SupportTicket[]>> {
  const sb = createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return { data: null, error: 'Please sign in.' }

  const { data, error } = await sb
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return { data: null, error: error.message }
  return { data: (data ?? []).map((r) => mapRow(r as Row)), error: null }
}
