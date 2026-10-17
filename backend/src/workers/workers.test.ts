import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SmsWorkerService, MockSmsProvider } from './sms-worker';
import { EmailWorkerService, MockEmailProvider } from './email-worker';
import { PushWorkerService, MockPushProvider } from './push-worker';
import { EventDispatcher } from './event-dispatcher';

describe('Notification Workers Microservices Tests', () => {
  describe('SMS Worker Service', () => {
    it('normalizes Indian phone numbers and sends SMS via provider', async () => {
      const mockProvider = new MockSmsProvider();
      const smsWorker = new SmsWorkerService(mockProvider);

      const normalized = smsWorker.normalizePhoneNumber('9876543210');
      assert.strictEqual(normalized, '+919876543210');

      const result = await smsWorker.processSms({
        toPhoneNumber: '9876543210',
        messageText: 'Your CarryGo OTP is 123456',
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.messageId);
      assert.strictEqual(mockProvider.sentMessages.length, 1);
      assert.strictEqual(mockProvider.sentMessages[0].toPhoneNumber, '+919876543210');
      assert.strictEqual(mockProvider.sentMessages[0].messageText, 'Your CarryGo OTP is 123456');
    });

    it('processes SQS event batch cleanly', async () => {
      const mockProvider = new MockSmsProvider();
      const smsWorker = new SmsWorkerService(mockProvider);

      const mockSqsEvent = {
        Records: [
          {
            messageId: 'msg-1',
            body: JSON.stringify({
              toPhoneNumber: '+919876543210',
              messageText: 'Test SMS 1',
            }),
          },
          {
            messageId: 'msg-2',
            body: JSON.stringify({
              toPhoneNumber: '+919876543211',
              messageText: 'Test SMS 2',
            }),
          },
        ],
      };

      const batchResult = await smsWorker.processQueueBatch(mockSqsEvent as any);
      assert.strictEqual(batchResult.processedCount, 2);
      assert.strictEqual(batchResult.successCount, 2);
      assert.strictEqual(batchResult.failureCount, 0);
      assert.strictEqual(mockProvider.sentMessages.length, 2);
    });
  });

  describe('Email Worker Service', () => {
    it('renders email templates and dispatches email', async () => {
      const mockProvider = new MockEmailProvider();
      const emailWorker = new EmailWorkerService(mockProvider);

      const result = await emailWorker.processEmail({
        toEmail: 'customer@example.com',
        subject: 'Booking Confirmed',
        template: 'BOOKING_CONFIRMED',
        variables: {
          userName: 'Rahul',
          bookingId: 'BK-101',
          fromCity: 'Delhi',
          toCity: 'Jaipur',
        },
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(mockProvider.sentEmails.length, 1);
      assert.strictEqual(mockProvider.sentEmails[0].toEmail, 'customer@example.com');
      assert.match(mockProvider.sentEmails[0].htmlBody, /CarryGo Booking Confirmed!/);
      assert.match(mockProvider.sentEmails[0].htmlBody, /Delhi to Jaipur/);
    });
  });

  describe('Push Worker Service', () => {
    it('batches push notifications and detects invalid tokens', async () => {
      const mockProvider = new MockPushProvider();
      const pushWorker = new PushWorkerService(mockProvider);

      const validToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
      const result = await pushWorker.processPush({
        toToken: validToken,
        title: 'New Trip! 🚗',
        body: 'A driver is heading your way',
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(mockProvider.sentPushes.length, 1);
      assert.strictEqual(mockProvider.sentPushes[0].to, validToken);
    });

    it('rejects invalid or empty push tokens gracefully', async () => {
      const mockProvider = new MockPushProvider();
      const pushWorker = new PushWorkerService(mockProvider);

      const result = await pushWorker.processPush({
        toToken: 'short',
        title: 'Test',
        body: 'Test body',
      });

      assert.strictEqual(result.success, false);
      assert.match(result.error ?? '', /No valid or active push tokens/);
      assert.strictEqual(mockProvider.sentPushes.length, 0);
    });
  });

  describe('Event Dispatcher', () => {
    it('fans out domain events to appropriate notification channels', async () => {
      const dispatcher = new EventDispatcher();

      // Trip created event
      const tripResult = await dispatcher.handleDomainEvent({
        topic: 'trip.created',
        entityType: 'trip',
        entityId: 'trip-1',
        payload: {
          fromCity: 'Mumbai',
          toCity: 'Pune',
          matchedTokens: ['ExponentPushToken[token1]'],
        },
      });
      assert.strictEqual(tripResult.pushDispatched, true);

      // Escrow locked event
      const escrowResult = await dispatcher.handleDomainEvent({
        topic: 'booking.escrow_locked',
        entityType: 'booking',
        entityId: 'booking-1',
        payload: {
          amount: 500,
          senderEmail: 'sender@example.com',
          travellerPushToken: 'ExponentPushToken[token2]',
        },
      });
      assert.strictEqual(escrowResult.emailDispatched, true);
      assert.strictEqual(escrowResult.pushDispatched, true);
    });
  });
});
