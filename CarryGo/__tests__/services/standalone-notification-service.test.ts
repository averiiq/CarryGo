/**
 * Standalone Notification Architecture Unit Tests
 * Tests strict user isolation, anti-self-alerting guards, single-user device registration,
 * and multi-channel orchestration.
 */

import { notificationOrchestrator } from '@/services/notifications/orchestrator';
import { inAppNotificationService } from '@/services/notifications/in-app.service';
import { pushNotificationService } from '@/services/notifications/push.service';
import { emailNotificationService } from '@/services/notifications/email.service';
import { smsNotificationService } from '@/services/notifications/sms.service';
import {
  notifyNewRequest,
  notifyNewCarryOffer,
  notifyRequestAccepted,
  notifyRequestDeclined,
  notifyPickupConfirmed,
  notifyDeliveryCompleted,
  notifyChatMessage,
  notifyPaymentReserved,
} from '@/services/notifications';
import { getSupabaseClient } from '@/template';

// Mock dependencies
jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/monitoring', () => ({
  captureException: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: jest.fn().mockResolvedValue({}),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('test-local-id'),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[mock-token-123]' }),
  AndroidImportance: { MAX: 5 },
}));

jest.mock('@/services/email/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'resend_mock_123' }),
}));

describe('Standalone Notification Service Architecture', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      rpc: jest.fn().mockResolvedValue({
        data: [{ notification_id: 'notif-uuid-1', push_tokens: ['ExponentPushToken[target-user-token]'] }],
        error: null,
      }),
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'notif-uuid-1' }, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
      functions: {
        invoke: jest.fn().mockResolvedValue({ data: { success: true }, error: null }),
      },
    };

    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);
    // Mock global fetch for Expo Push API and SMS
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: [{ status: 'ok', id: 'ticket-1' }] }),
    }) as any;
  });

  describe('Anti-Self-Alerting Guard', () => {
    it('strictly suppresses notifications when senderId matches recipientId', async () => {
      const userA = 'user-uuid-aaaa-1111';

      const result = await notificationOrchestrator.send({
        recipient: userA,
        senderId: userA, // User A triggers an action
        title: '📦 New Request',
        body: 'You sent a request',
        type: 'new_request',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Self-notification suppressed');
      expect(result.channelResults.in_app?.skipped).toBe(true);
      expect(result.channelResults.push?.skipped).toBe(true);

      // Verify no DB notification was inserted
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it('allows notifications when senderId is distinct from recipientId', async () => {
      const senderUserA = 'user-uuid-aaaa-1111';
      const recipientUserB = 'user-uuid-bbbb-2222';

      const result = await notificationOrchestrator.send({
        recipient: recipientUserB,
        senderId: senderUserA,
        title: '📦 New Delivery Request!',
        body: 'User A requested space on your route',
        type: 'new_request',
        category: 'matching',
        channels: ['in_app', 'push'],
      });

      expect(result.success).toBe(true);
      expect(result.recipientId).toBe(recipientUserB);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'dispatch_notification_command',
        expect.objectContaining({
          p_recipient_id: recipientUserB,
          p_title: '📦 New Delivery Request!',
        })
      );
    });
  });

  describe('Device Push Token Single-User Ownership', () => {
    it('invalidates push tokens from other users when a user signs in on that device', async () => {
      const newUser = 'user-uuid-bbbb-2222';
      const sharedDeviceToken = 'ExponentPushToken[shared-phone-token]';

      const registered = await pushNotificationService.registerPushToken(newUser, sharedDeviceToken);

      expect(registered).toBe(true);

      // Verify user_devices updated with invalidated_at for OTHER users
      expect(mockSupabase.from).toHaveBeenCalledWith('user_devices');
      const updateCall = mockSupabase.from('user_devices').update;
      expect(updateCall).toHaveBeenCalledWith(expect.objectContaining({ invalidated_at: expect.any(String) }));

      // Verify upsert_user_device called for newUser
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'upsert_user_device',
        expect.objectContaining({
          p_expo_push_token: sharedDeviceToken,
        })
      );

      // Verify user_profiles push_token updated for newUser
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('deactivates push token on sign-out cleanly', async () => {
      const loggingOutUser = 'user-uuid-bbbb-2222';

      await pushNotificationService.unregisterPushToken(loggingOutUser);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_devices');
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
    });
  });

  describe('Multi-Channel Orchestration', () => {
    it('dispatches across in-app, push, email, and sms channels in parallel', async () => {
      const recipientId = 'user-uuid-recipient-999';
      const senderId = 'user-uuid-sender-111';

      // Mock profile resolution for email and phone
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { email: 'recipient@example.com', phone: '+919876543210' },
              error: null,
            }),
            update: jest.fn().mockReturnThis(),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'notif-1' }, error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await notificationOrchestrator.send({
        recipient: recipientId,
        senderId,
        title: '🔑 Pickup OTP Ready',
        body: 'Your pickup code is 849201',
        type: 'delivery_otp',
        category: 'parcel_update',
        priority: 'critical',
        channels: ['in_app', 'push', 'email', 'sms'],
        smsOptions: { otp: '849201' },
      });

      expect(result.success).toBe(true);
      expect(result.channelResults.in_app?.success).toBe(true);
      expect(result.channelResults.push?.success).toBe(true);
      expect(result.channelResults.email?.success).toBe(true);
      expect(result.channelResults.sms?.success).toBe(true);
    });
  });

  describe('Domain Event Convenience Helpers', () => {
    it('notifyNewRequest passes correct senderId and recipientId', async () => {
      const res = await notifyNewRequest({
        travellerId: 'traveller-id-123',
        senderId: 'sender-id-456',
        senderName: 'Rajesh',
        price: 350,
        requestId: 'req-789',
        fromCity: 'Delhi',
        toCity: 'Jaipur',
      });

      expect(res.success).toBe(true);
      expect(res.recipientId).toBe('traveller-id-123');
    });

    it('notifyNewCarryOffer passes correct senderId and recipientId', async () => {
      const res = await notifyNewCarryOffer({
        senderId: 'sender-id-456',
        travellerId: 'traveller-id-123',
        travellerName: 'Priya',
        price: 350,
        requestId: 'req-789',
        fromCity: 'Delhi',
        toCity: 'Jaipur',
      });

      expect(res.success).toBe(true);
      expect(res.recipientId).toBe('sender-id-456');
    });

    it('notifyChatMessage sends isolated chat alert with preview', async () => {
      const res = await notifyChatMessage({
        recipientId: 'recipient-id-222',
        senderId: 'sender-id-111',
        senderName: 'Aarav',
        text: 'I have arrived at the pickup location near the metro station.',
        conversationId: 'conv-555',
      });

      expect(res.success).toBe(true);
      expect(res.recipientId).toBe('recipient-id-222');
    });
  });

  describe('Zero Escrow Tolerance Compliance', () => {
    it('notifyPaymentReserved uses reserved/held wording and contains ZERO instances of escrow', async () => {
      const res = await notifyPaymentReserved({
        recipientId: 'sender-user-1',
        senderId: 'traveller-user-2',
        amount: 450,
        requestId: 'req-101',
      });

      expect(res.success).toBe(true);

      // Verify payload passed to RPC had NO mention of escrow
      const lastRpcCall = mockSupabase.rpc.mock.calls.find(
        (call: any[]) => call[0] === 'dispatch_notification_command'
      );
      expect(lastRpcCall).toBeDefined();
      const rpcArgs = lastRpcCall[1];
      expect(rpcArgs.p_title.toLowerCase()).not.toContain('escrow');
      expect(rpcArgs.p_body.toLowerCase()).not.toContain('escrow');
      expect(rpcArgs.p_title).toContain('Reserved');
    });
  });
});

