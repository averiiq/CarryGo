import { getSupabaseClient } from '@/template';
import { ServiceResult, SupportTicket, SupportTicketCategory, SupportTicketStatus } from '@/types';
import { isValidUuid, sanitizeTextInput } from '@/lib/sanitize';

export const SUPPORT_CATEGORIES: Record<SupportTicketCategory, { label: string; description: string }> = {
  delivery_issue: {
    label: 'Delivery Issue',
    description: 'Delays, missed pickup, OTP issues, or damaged goods',
  },
  payment_refund: {
    label: 'Payment & Refund',
    description: 'Escrow release delay, refund query, or pricing dispute',
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
    description: 'Crash, map glitches, notification issues, or UI error',
  },
  general: {
    label: 'General Inquiry',
    description: 'Questions about rules, how CarryGo works, or feedback',
  },
};

export interface ShipmentContext {
  requestId?: string;
  parcelId?: string;
  tripId?: string;
  route?: string;
  role?: string;
}

export interface CreateSupportTicketParams {
  userId: string;
  subject: string;
  description: string;
  category?: SupportTicketCategory;
  shipmentContext?: ShipmentContext;
}

export interface SupportTicketRow {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

// In-memory rate-limiter: max 3 tickets per 10 minutes, min 15 seconds between submissions
const userLastSubmissions: Map<string, number[]> = new Map();
const SUBMISSION_WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 3;
const MIN_INTERVAL_MS = 15 * 1000;

export function checkSupportRateLimit(userId: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const timestamps = (userLastSubmissions.get(userId) || []).filter(
    (t) => now - t < SUBMISSION_WINDOW_MS
  );

  if (timestamps.length > 0) {
    const last = timestamps[timestamps.length - 1];
    if (now - last < MIN_INTERVAL_MS) {
      return {
        allowed: false,
        error: 'Please wait a moment before submitting another ticket.',
      };
    }
  }

  if (timestamps.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    return {
      allowed: false,
      error: 'You have submitted multiple tickets recently. Our team is already reviewing them.',
    };
  }

  return { allowed: true };
}

export function recordSupportSubmission(userId: string) {
  const now = Date.now();
  const timestamps = (userLastSubmissions.get(userId) || []).filter(
    (t) => now - t < SUBMISSION_WINDOW_MS
  );
  timestamps.push(now);
  userLastSubmissions.set(userId, timestamps);
}

export function resetSupportRateLimit(userId?: string) {
  if (userId) {
    userLastSubmissions.delete(userId);
  } else {
    userLastSubmissions.clear();
  }
}

export function formatTicketSubject(subject: string, category?: SupportTicketCategory): string {
  const cleanSubject = sanitizeTextInput(subject, 100);
  if (!category) return cleanSubject;
  const label = SUPPORT_CATEGORIES[category]?.label;
  if (!label) return cleanSubject;
  if (cleanSubject.startsWith(`[${label}]`)) return cleanSubject;
  return `[${label}] ${cleanSubject}`;
}

export function parseTicketSubject(rawSubject: string): { category?: SupportTicketCategory; subject: string } {
  if (!rawSubject) return { subject: '' };
  for (const [key, value] of Object.entries(SUPPORT_CATEGORIES)) {
    const prefix = `[${value.label}]`;
    if (rawSubject.startsWith(prefix)) {
      return {
        category: key as SupportTicketCategory,
        subject: rawSubject.slice(prefix.length).trim(),
      };
    }
  }
  return { subject: rawSubject.trim() };
}

export function formatTicketDescription(description: string, context?: ShipmentContext): string {
  const cleanDesc = sanitizeTextInput(description, 2000);
  if (!context || (!context.requestId && !context.route && !context.parcelId)) {
    return cleanDesc;
  }

  const parts: string[] = [];
  if (context.requestId) parts.push(`Request #${context.requestId.slice(0, 8)}`);
  if (context.route) parts.push(`Route: ${context.route}`);
  if (context.role) parts.push(`User Role: ${context.role}`);

  const header = `[Linked Shipment: ${parts.join(' | ')}]\n\n`;
  return `${header}${cleanDesc}`;
}

export function mapSupportTicketRow(row: SupportTicketRow): SupportTicket {
  const { category, subject } = parseTicketSubject(row.subject);
  const validStatus: SupportTicketStatus =
    ['open', 'in_progress', 'resolved', 'closed'].includes(row.status)
      ? (row.status as SupportTicketStatus)
      : 'open';

  return {
    id: row.id,
    userId: row.user_id,
    subject,
    rawSubject: row.subject,
    category,
    description: row.description,
    status: validStatus,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Validates ticket fields locally prior to database insertion.
 */
export function validateTicketInput(params: {
  userId: string;
  subject: string;
  description: string;
  category?: SupportTicketCategory;
}): { valid: boolean; error?: string } {
  if (!params.userId || !isValidUuid(params.userId)) {
    return { valid: false, error: 'Valid user ID is required' };
  }

  const cleanSubject = sanitizeTextInput(params.subject || '', 120);
  if (!cleanSubject || cleanSubject.length < 5) {
    return { valid: false, error: 'Subject must be at least 5 characters' };
  }
  if (cleanSubject.length > 100) {
    return { valid: false, error: 'Subject cannot exceed 100 characters' };
  }

  const cleanDesc = sanitizeTextInput(params.description || '', 2500);
  if (!cleanDesc || cleanDesc.length < 15) {
    return { valid: false, error: 'Description must be at least 15 characters to explain the issue' };
  }
  if (cleanDesc.length > 2000) {
    return { valid: false, error: 'Description cannot exceed 2000 characters' };
  }

  if (params.category && !SUPPORT_CATEGORIES[params.category]) {
    return { valid: false, error: 'Invalid support category' };
  }

  return { valid: true };
}

/**
 * Creates a new support ticket in the database with rate limiting & session checks.
 */
export async function createSupportTicket(
  params: CreateSupportTicketParams
): Promise<ServiceResult<SupportTicket>> {
  const validation = validateTicketInput(params);
  if (!validation.valid) {
    return { data: null, error: validation.error || 'Invalid ticket submission' };
  }

  // Enforce support rate limit
  const rateLimitCheck = checkSupportRateLimit(params.userId);
  if (!rateLimitCheck.allowed) {
    return { data: null, error: rateLimitCheck.error || 'Too many submissions. Please try again later.' };
  }

  const sb = getSupabaseClient();

  // Verify auth session matches the userId
  const { data: { user } } = await sb.auth.getUser();
  if (!user || user.id !== params.userId) {
    return { data: null, error: 'Unauthorized: Session mismatch' };
  }

  const formattedSubject = formatTicketSubject(params.subject, params.category);
  const formattedDescription = formatTicketDescription(params.description, params.shipmentContext);

  const { data, error } = await sb
    .from('support_tickets')
    .insert({
      user_id: params.userId,
      subject: formattedSubject,
      description: formattedDescription,
      status: 'open',
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message || 'Failed to submit support ticket' };
  }

  // Record submission timestamp for rate limiter
  recordSupportSubmission(params.userId);

  return { data: mapSupportTicketRow(data as unknown as SupportTicketRow), error: null };
}

/**
 * Retrieves all support tickets submitted by a specific user.
 */
export async function getUserSupportTickets(
  userId: string
): Promise<ServiceResult<SupportTicket[]>> {
  if (!userId || !isValidUuid(userId)) {
    return { data: null, error: 'Invalid user ID' };
  }

  const sb = getSupabaseClient();

  // Verify user ownership
  const { data: { user } } = await sb.auth.getUser();
  if (!user || user.id !== userId) {
    return { data: null, error: 'Unauthorized: Session mismatch' };
  }

  const { data, error } = await sb
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message || 'Failed to fetch support tickets' };
  }

  const rows = (data || []) as unknown as SupportTicketRow[];
  return { data: rows.map(mapSupportTicketRow), error: null };
}

/**
 * Retrieves a single support ticket by its ID for a specific user.
 */
export async function getSupportTicketById(
  ticketId: string,
  userId: string
): Promise<ServiceResult<SupportTicket>> {
  if (!ticketId || !isValidUuid(ticketId) || !userId || !isValidUuid(userId)) {
    return { data: null, error: 'Invalid ID parameters' };
  }

  const sb = getSupabaseClient();

  const { data: { user } } = await sb.auth.getUser();
  if (!user || user.id !== userId) {
    return { data: null, error: 'Unauthorized: Session mismatch' };
  }

  const { data, error } = await sb
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return { data: null, error: error.message || 'Support ticket not found' };
  }

  return { data: mapSupportTicketRow(data as unknown as SupportTicketRow), error: null };
}
