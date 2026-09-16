import {
  validateTicketInput,
  formatTicketSubject,
  parseTicketSubject,
  formatTicketDescription,
  checkSupportRateLimit,
  recordSupportSubmission,
  resetSupportRateLimit,
  mapSupportTicketRow,
  SUPPORT_CATEGORIES,
  SupportTicketRow,
} from '@/services/support.service';
import { SupportTicketCategory } from '@/types';

jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  })),
}));

describe('Support Service - Input Validation & Formatting', () => {
  const validUserId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    resetSupportRateLimit();
  });

  describe('validateTicketInput', () => {
    it('accepts valid ticket input', () => {
      const res = validateTicketInput({
        userId: validUserId,
        subject: 'Parcel was not delivered',
        description: 'The traveler did not show up at the scheduled meetup location.',
        category: 'delivery_issue',
      });
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('rejects invalid or missing user ID', () => {
      const res1 = validateTicketInput({
        userId: '',
        subject: 'Valid Subject',
        description: 'Valid description with enough characters for testing.',
      });
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('user ID');

      const res2 = validateTicketInput({
        userId: 'not-a-uuid',
        subject: 'Valid Subject',
        description: 'Valid description with enough characters for testing.',
      });
      expect(res2.valid).toBe(false);
    });

    it('rejects subjects that are too short (< 5 chars)', () => {
      const res = validateTicketInput({
        userId: validUserId,
        subject: 'Help',
        description: 'Valid description with enough characters for testing.',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('at least 5 characters');
    });

    it('rejects subjects exceeding 100 characters', () => {
      const res = validateTicketInput({
        userId: validUserId,
        subject: 'A'.repeat(101),
        description: 'Valid description with enough characters for testing.',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('cannot exceed 100 characters');
    });

    it('rejects descriptions that are too short (< 15 chars)', () => {
      const res = validateTicketInput({
        userId: validUserId,
        subject: 'Valid Subject',
        description: 'Too short',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('at least 15 characters');
    });

    it('rejects descriptions exceeding 2000 characters', () => {
      const res = validateTicketInput({
        userId: validUserId,
        subject: 'Valid Subject',
        description: 'A'.repeat(2001),
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('cannot exceed 2000 characters');
    });

    it('rejects invalid category if provided', () => {
      const res = validateTicketInput({
        userId: validUserId,
        subject: 'Valid Subject',
        description: 'Valid description with enough characters for testing.',
        category: 'invalid_cat' as SupportTicketCategory,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid support category');
    });
  });

  describe('formatTicketSubject', () => {
    it('prepends category label when category is provided', () => {
      const formatted = formatTicketSubject('Refund not received', 'payment_refund');
      expect(formatted).toBe('[Payment & Refund] Refund not received');
    });

    it('returns raw subject if no category is provided', () => {
      const formatted = formatTicketSubject('Generic feedback');
      expect(formatted).toBe('Generic feedback');
    });

    it('does not duplicate category prefix if already present', () => {
      const formatted = formatTicketSubject('[Payment & Refund] Refund not received', 'payment_refund');
      expect(formatted).toBe('[Payment & Refund] Refund not received');
    });

    it('sanitizes text input properly', () => {
      const formatted = formatTicketSubject('   Extra spaces trimmed   ', 'delivery_issue');
      expect(formatted).toBe('[Delivery Issue] Extra spaces trimmed');
    });
  });

  describe('parseTicketSubject', () => {
    it('correctly parses category and clean subject', () => {
      const parsed = parseTicketSubject('[Delivery Issue] Traveler did not arrive');
      expect(parsed.category).toBe('delivery_issue');
      expect(parsed.subject).toBe('Traveler did not arrive');
    });

    it('handles subjects without category prefix', () => {
      const parsed = parseTicketSubject('General query about fees');
      expect(parsed.category).toBeUndefined();
      expect(parsed.subject).toBe('General query about fees');
    });

    it('handles empty subject string', () => {
      const parsed = parseTicketSubject('');
      expect(parsed.subject).toBe('');
    });
  });

  describe('formatTicketDescription with Shipment Context', () => {
    it('returns plain description when no context is provided', () => {
      const desc = formatTicketDescription('Payment was deducted twice.');
      expect(desc).toBe('Payment was deducted twice.');
    });

    it('attaches shipment details into description header when provided', () => {
      const desc = formatTicketDescription('Traveler did not arrive at pickup.', {
        requestId: 'req-12345678-uuid',
        route: 'Mumbai → Pune',
        role: 'Sender',
      });
      expect(desc).toContain('[Linked Shipment: Request #req-1234 | Route: Mumbai → Pune | User Role: Sender]');
      expect(desc).toContain('Traveler did not arrive at pickup.');
    });
  });

  describe('checkSupportRateLimit', () => {
    it('allows first submission for a user', () => {
      const res = checkSupportRateLimit(validUserId);
      expect(res.allowed).toBe(true);
    });

    it('blocks rapid back-to-back submissions within 15 seconds', () => {
      recordSupportSubmission(validUserId);
      const res = checkSupportRateLimit(validUserId);
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('wait a moment');
    });

    it('allows submission after rate limit is reset', () => {
      recordSupportSubmission(validUserId);
      resetSupportRateLimit(validUserId);
      const res = checkSupportRateLimit(validUserId);
      expect(res.allowed).toBe(true);
    });
  });

  describe('mapSupportTicketRow', () => {
    it('correctly maps row to domain SupportTicket', () => {
      const row: SupportTicketRow = {
        id: '987e6543-e21b-12d3-a456-426614174000',
        user_id: validUserId,
        subject: '[KYC & Account] Verification stuck in review',
        description: 'My Aadhaar card was submitted 48 hours ago and is still in review.',
        status: 'in_progress',
        assigned_to: 'admin-uuid-1',
        created_at: '2026-09-16T10:00:00Z',
        updated_at: '2026-09-16T10:30:00Z',
      };

      const mapped = mapSupportTicketRow(row);
      expect(mapped.id).toBe(row.id);
      expect(mapped.userId).toBe(row.user_id);
      expect(mapped.category).toBe('kyc_account');
      expect(mapped.subject).toBe('Verification stuck in review');
      expect(mapped.rawSubject).toBe(row.subject);
      expect(mapped.description).toBe(row.description);
      expect(mapped.status).toBe('in_progress');
      expect(mapped.assignedTo).toBe('admin-uuid-1');
    });

    it('falls back to "open" status if database contains an unexpected status string', () => {
      const row: SupportTicketRow = {
        id: '987e6543-e21b-12d3-a456-426614174000',
        user_id: validUserId,
        subject: 'Something broke',
        description: 'Something broke in the mobile app screen navigation.',
        status: 'unknown_status_code',
        assigned_to: null,
        created_at: '2026-09-16T10:00:00Z',
        updated_at: '2026-09-16T10:00:00Z',
      };

      const mapped = mapSupportTicketRow(row);
      expect(mapped.status).toBe('open');
    });
  });

  describe('SUPPORT_CATEGORIES config', () => {
    it('has labels and descriptions for all defined categories', () => {
      const categories: SupportTicketCategory[] = [
        'delivery_issue',
        'payment_refund',
        'kyc_account',
        'safety_conduct',
        'technical_bug',
        'general',
      ];

      for (const cat of categories) {
        expect(SUPPORT_CATEGORIES[cat]).toBeDefined();
        expect(SUPPORT_CATEGORIES[cat].label.length).toBeGreaterThan(0);
        expect(SUPPORT_CATEGORIES[cat].description.length).toBeGreaterThan(0);
      }
    });
  });
});
