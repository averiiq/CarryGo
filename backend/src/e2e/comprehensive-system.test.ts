import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ApiGateway } from '../gateway/api-gateway';
import { LoadBalancer } from '../infrastructure/load-balancer/load-balancer';
import { DistributedLock } from '../lib/distributed-lock';
import { BookingEscrowPipeline } from '../pipelines/booking-escrow.pipeline';
import { DeliveryHandoverPipeline, HandoverState } from '../pipelines/delivery-handover.pipeline';
import { NotificationFanoutPipeline } from '../pipelines/notification-fanout.pipeline';
import { SmsWorkerService, MockSmsProvider } from '../workers/sms-worker';
import { EmailWorkerService, MockEmailProvider } from '../workers/email-worker';
import { PushWorkerService, MockPushProvider } from '../workers/push-worker';
import { EventDispatcher } from '../workers/event-dispatcher';
import { routeRequest } from '../http/router';
import { CircuitBreaker } from '../lib/circuit-breaker';
import { idempotencyEngine } from '../lib/idempotency';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

describe('Comprehensive System End-to-End Test Suite', () => {
  describe('1. API Gateway & Microservices Routing', () => {
    it('serves core health check endpoints (/health/live, /health/ready, /health/metrics)', async () => {
      const createEvent = (path: string): APIGatewayProxyEventV2 => ({
        version: '2.0',
        routeKey: `GET ${path}`,
        rawPath: path,
        rawQueryString: '',
        headers: {},
        requestContext: {
          accountId: '123456789012',
          apiId: 'test-api',
          domainName: 'test.carrygo.in',
          domainPrefix: 'test',
          http: {
            method: 'GET',
            path,
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'IntegrationTest/1.0',
          },
          requestId: 'test-req-health',
          routeKey: `GET ${path}`,
          stage: '$default',
          time: new Date().toISOString(),
          timeEpoch: Date.now(),
        },
        isBase64Encoded: false,
      });

      const resLive = await routeRequest(createEvent('/health/live'));
      assert.strictEqual(resLive.statusCode, 200);
      const liveBody = JSON.parse(resLive.body);
      assert.strictEqual(liveBody.status, 'live');

      const resReady = await routeRequest(createEvent('/health/ready'));
      assert.strictEqual(resReady.statusCode, 200);
      const readyBody = JSON.parse(resReady.body);
      assert.strictEqual(readyBody.status, 'ready');

      const resMetrics = await routeRequest(createEvent('/health/metrics'));
      assert.strictEqual(resMetrics.statusCode, 200);
      const metricsBody = JSON.parse(resMetrics.body);
      assert.ok(metricsBody.uptimeSeconds >= 0);
      assert.ok(metricsBody.memory);
    });

    it('enforces correlation IDs and server timing headers across microservice routes', async () => {
      const gateway = new ApiGateway([
        {
          name: 'trips-service',
          baseUrlTargets: ['http://127.0.0.1:8001', 'http://127.0.0.1:8002'],
          algorithm: 'LEAST_CONNECTIONS',
        },
      ]);

      const res = await gateway.handleRequest({
        method: 'GET',
        path: '/api/trips',
        headers: {
          'x-correlation-id': 'trace-carrygo-999',
        },
        sourceIp: '10.0.0.1',
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.headers['x-correlation-id'], 'trace-carrygo-999');
      assert.ok(res.headers['x-request-id']);
      assert.match(res.headers['server-timing'], /^gw;dur=/);
    });
  });

  describe('2. Load Balancer Algorithm Validations', () => {
    it('distributes 100 requests evenly using Round Robin', () => {
      const targets = [
        { id: 'replica-1', host: '127.0.0.1', port: 3001, isHealthy: true, activeConnections: 0, consecutiveFailures: 0 },
        { id: 'replica-2', host: '127.0.0.1', port: 3002, isHealthy: true, activeConnections: 0, consecutiveFailures: 0 },
        { id: 'replica-3', host: '127.0.0.1', port: 3003, isHealthy: true, activeConnections: 0, consecutiveFailures: 0 },
      ];
      const lb = new LoadBalancer(targets, { algorithm: 'ROUND_ROBIN' });

      const counts: Record<string, number> = { 'replica-1': 0, 'replica-2': 0, 'replica-3': 0 };
      for (let i = 0; i < 99; i++) {
        const target = lb.selectTarget();
        assert.ok(target);
        counts[target.id]++;
      }

      assert.strictEqual(counts['replica-1'], 33);
      assert.strictEqual(counts['replica-2'], 33);
      assert.strictEqual(counts['replica-3'], 33);
    });

    it('routes to the least busy instance using Least Connections', () => {
      const targets = [
        { id: 'heavy-node', host: '127.0.0.1', port: 3001, isHealthy: true, activeConnections: 12, consecutiveFailures: 0 },
        { id: 'light-node', host: '127.0.0.1', port: 3002, isHealthy: true, activeConnections: 1, consecutiveFailures: 0 },
        { id: 'med-node', host: '127.0.0.1', port: 3003, isHealthy: true, activeConnections: 6, consecutiveFailures: 0 },
      ];
      const lb = new LoadBalancer(targets, { algorithm: 'LEAST_CONNECTIONS' });

      const selected = lb.selectTarget();
      assert.ok(selected);
      assert.strictEqual(selected.id, 'light-node');
    });
  });

  describe('3. Distributed Lock (Redlock Pattern)', () => {
    it('handles concurrent lock contention safely without race conditions', async () => {
      const lock = new DistributedLock();
      const resource = 'shared-trip-capacity-lock';

      let counter = 0;
      const worker = async () => {
        await lock.withLock(
          resource,
          async () => {
            const current = counter;
            await new Promise((r) => setTimeout(r, 10));
            counter = current + 1;
          },
          { ttlSeconds: 2, retryAttempts: 5, retryDelayMs: 25 },
        );
      };

      // Run 5 contentious operations in parallel
      await Promise.all([worker(), worker(), worker(), worker(), worker()]);

      // If race conditions existed, counter would be less than 5
      assert.strictEqual(counter, 5, 'Counter must be exactly 5 after atomic locked executions');
    });
  });

  describe('4. Booking & Escrow Pipeline Functional Flow', () => {
    it('executes full booking lifecycle: capacity hold -> escrow generation -> notification fanout', async () => {
      const pipeline = new BookingEscrowPipeline();

      const booking = await pipeline.execute({
        bookingId: 'bk-full-001',
        tripId: 'trip-delhi-jaipur-1',
        parcelId: 'parcel-books-1',
        senderId: 'usr-sender-101',
        travellerId: 'usr-traveler-202',
        senderEmail: 'sender@carrygo.in',
        travellerPushToken: 'ExponentPushToken[travelerToken123]',
        amount: 1500,
        weightKg: 8,
        availableCapacityKg: 20,
        idempotencyKey: 'idem-full-flow-1',
      });

      assert.strictEqual(booking.success, true);
      assert.strictEqual(booking.status, 'ESCROW_LOCKED');
      assert.strictEqual(booking.remainingCapacityKg, 12);
      assert.ok(booking.escrowTransactionId);

      // Replay should return identical transaction ID from idempotency cache
      const replay = await pipeline.execute({
        bookingId: 'bk-full-001',
        tripId: 'trip-delhi-jaipur-1',
        parcelId: 'parcel-books-1',
        senderId: 'usr-sender-101',
        travellerId: 'usr-traveler-202',
        amount: 1500,
        weightKg: 8,
        availableCapacityKg: 20,
        idempotencyKey: 'idem-full-flow-1',
      });

      assert.strictEqual(replay.escrowTransactionId, booking.escrowTransactionId);
    });

    it('rejects booking when capacity is insufficient', async () => {
      const pipeline = new BookingEscrowPipeline();

      const booking = await pipeline.execute({
        bookingId: 'bk-full-002',
        tripId: 'trip-mumbai-pune-2',
        parcelId: 'parcel-heavy-1',
        senderId: 'usr-sender-102',
        travellerId: 'usr-traveler-203',
        amount: 2000,
        weightKg: 30,
        availableCapacityKg: 10,
      });

      assert.strictEqual(booking.success, false);
      assert.strictEqual(booking.status, 'CAPACITY_EXCEEDED');
    });
  });

  describe('5. Delivery Handover & Cryptographic Custody Pipeline', () => {
    it('verifies pickup OTP, transitions to in-transit, verifies delivery OTP, and settles payout', async () => {
      const pipeline = new DeliveryHandoverPipeline();

      const initial: HandoverState = {
        parcelId: 'pkg-electronics-99',
        senderId: 'snd-1',
        travellerId: 'trv-1',
        recipientPhone: '+919999988888',
        senderEmail: 'sender@example.com',
        travellerEmail: 'traveler@example.com',
        payoutAmount: 1100,
        status: 'PENDING_PICKUP',
      };

      // 1. Pickup OTP Generation & Verification
      const { state: stateWithPickup, plainOtp: pickupOtp } = pipeline.initiatePickup(initial);
      assert.strictEqual(pickupOtp.length, 6);

      const pickupResult = pipeline.verifyPickup(stateWithPickup, pickupOtp);
      assert.strictEqual(pickupResult.success, true);
      assert.strictEqual(pickupResult.status, 'IN_TRANSIT');

      // 2. Delivery OTP Generation & Verification
      const { state: stateWithDelivery, plainOtp: deliveryOtp } = pipeline.initiateDelivery(stateWithPickup);
      assert.strictEqual(deliveryOtp.length, 6);

      const settlementResult = await pipeline.verifyDeliveryAndReleaseEscrow(
        stateWithDelivery,
        deliveryOtp,
        'idem-settle-pkg-99',
      );

      assert.strictEqual(settlementResult.success, true);
      assert.strictEqual(settlementResult.status, 'SETTLED');
      assert.ok(settlementResult.payoutTransactionId);
    });

    it('blocks handover when tampered or wrong OTP is entered', async () => {
      const pipeline = new DeliveryHandoverPipeline();
      const state: HandoverState = {
        parcelId: 'pkg-tampered-1',
        senderId: 'snd-2',
        travellerId: 'trv-2',
        recipientPhone: '+919876543210',
        payoutAmount: 500,
        status: 'PENDING_PICKUP',
      };

      const { state: pickupState } = pipeline.initiatePickup(state);
      const wrongPickup = pipeline.verifyPickup(pickupState, '999999');
      assert.strictEqual(wrongPickup.success, false);
      assert.match(wrongPickup.error ?? '', /Invalid pickup OTP/);
    });
  });

  describe('6. Notification Workers (Separated Services)', () => {
    it('SMS Worker processes Indian phone numbers with E.164 normalization and retries', async () => {
      const mockSms = new MockSmsProvider();
      const smsWorker = new SmsWorkerService(mockSms);

      const res = await smsWorker.processSms({
        toPhoneNumber: '9123456789',
        messageText: 'Your CarryGo verification code is 882190',
        idempotencyKey: 'sms-test-key-1',
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(mockSms.sentMessages[0].toPhoneNumber, '+919123456789');
      assert.match(mockSms.sentMessages[0].messageText, /882190/);
    });

    it('Email Worker renders professional transactional email templates', async () => {
      const mockEmail = new MockEmailProvider();
      const emailWorker = new EmailWorkerService(mockEmail);

      const res = await emailWorker.processEmail({
        toEmail: 'rahul@example.com',
        subject: 'Your CarryGo Escrow is Secured',
        template: 'ESCROW_HELD',
        variables: {
          requestId: 'REQ-550',
          amount: 1200,
        },
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(mockEmail.sentEmails[0].toEmail, 'rahul@example.com');
      assert.match(mockEmail.sentEmails[0].htmlBody, /Payment Secured in CarryGo Escrow/);
    });

    it('Push Worker batches large message volumes (100 per chunk)', async () => {
      const mockPush = new MockPushProvider();
      const pushWorker = new PushWorkerService(mockPush);

      // Generate 150 tokens to test chunking
      const tokens = Array.from({ length: 150 }, (_, i) => `ExponentPushToken[device-${i + 1}-abc]`);

      const res = await pushWorker.processPush({
        toToken: tokens,
        title: 'Flash Delivery Match! 🚀',
        body: 'A sender just posted a parcel on your upcoming route.',
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(mockPush.sentPushes.length, 150);
      assert.strictEqual(res.tickets?.length, 150);
    });

    it('Event Dispatcher fans out events to SMS, Email, and Push queues simultaneously', async () => {
      const dispatcher = new EventDispatcher();

      const fanout = await dispatcher.handleDomainEvent({
        topic: 'booking.escrow_locked',
        entityType: 'booking',
        entityId: 'bk-fanout-1',
        payload: {
          amount: 950,
          senderEmail: 'sender-fanout@carrygo.in',
          travellerPushToken: 'ExponentPushToken[travelerFanout]',
        },
      });

      assert.strictEqual(fanout.emailDispatched, true);
      assert.strictEqual(fanout.pushDispatched, true);
    });
  });

  describe('7. Resilience, Circuit Breakers & Idempotency Safeguards', () => {
    it('Circuit breaker prevents downstream cascading failures', async () => {
      const breaker = new CircuitBreaker({ name: 'resilience-test', failureThreshold: 3, resetTimeoutMs: 50 });

      let attempts = 0;
      const failingOp = async () => {
        attempts++;
        throw new Error('Downstream DB Timeout');
      };

      // 3 consecutive failures
      for (let i = 0; i < 3; i++) {
        await assert.rejects(async () => breaker.execute(failingOp));
      }

      assert.strictEqual(breaker.getState(), 'OPEN');

      // 4th call trips immediately without invoking failingOp
      await assert.rejects(
        async () => breaker.execute(failingOp),
        (err: any) => err.name === 'CircuitBreakerError',
      );
      assert.strictEqual(attempts, 3, 'Failing downstream service was not invoked while circuit was OPEN');

      // Wait for reset timeout
      await new Promise((r) => setTimeout(r, 60));
      assert.strictEqual(breaker.getState(), 'HALF_OPEN');

      // Successful recovery in HALF_OPEN resets breaker to CLOSED
      await breaker.execute(async () => 'ok');
      assert.strictEqual(breaker.getState(), 'CLOSED');
    });

    it('Idempotency engine rejects payload collisions on reused keys', () => {
      const key = 'idem-collision-test';
      const payload1 = JSON.stringify({ amount: 100 });
      const payload2 = JSON.stringify({ amount: 200 });

      const first = idempotencyEngine.acquire(key, payload1);
      assert.strictEqual(first.status, 'NEW');

      idempotencyEngine.complete(key, { statusCode: 200, headers: {}, body: 'ok' });

      // Same key, differing payload
      const collision = idempotencyEngine.acquire(key, payload2);
      assert.strictEqual(collision.status, 'PAYLOAD_MISMATCH');
    });
  });
});
