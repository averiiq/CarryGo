import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BookingEscrowPipeline } from './booking-escrow.pipeline';
import { DeliveryHandoverPipeline, HandoverState } from './delivery-handover.pipeline';
import { NotificationFanoutPipeline } from './notification-fanout.pipeline';

describe('Core Microservice Task Pipelines Tests', () => {
  describe('Booking & Escrow Pipeline', () => {
    it('successfully locks escrow and updates capacity under distributed lock', async () => {
      const pipeline = new BookingEscrowPipeline();

      const result = await pipeline.execute({
        bookingId: 'bk-test-1',
        tripId: 'trip-test-1',
        parcelId: 'parcel-test-1',
        senderId: 'user-sender-1',
        travellerId: 'user-traveler-1',
        amount: 850,
        weightKg: 5,
        availableCapacityKg: 15,
        idempotencyKey: 'idem-booking-1',
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, 'ESCROW_LOCKED');
      assert.strictEqual(result.remainingCapacityKg, 10);
      assert.ok(result.escrowTransactionId);

      // Replaying with identical idempotency key should return cached result
      const replayResult = await pipeline.execute({
        bookingId: 'bk-test-1',
        tripId: 'trip-test-1',
        parcelId: 'parcel-test-1',
        senderId: 'user-sender-1',
        travellerId: 'user-traveler-1',
        amount: 850,
        weightKg: 5,
        availableCapacityKg: 15,
        idempotencyKey: 'idem-booking-1',
      });

      assert.strictEqual(replayResult.success, true);
      assert.strictEqual(replayResult.status, 'ESCROW_LOCKED');
      assert.strictEqual(replayResult.escrowTransactionId, result.escrowTransactionId);
    });

    it('rejects booking when parcel weight exceeds trip capacity', async () => {
      const pipeline = new BookingEscrowPipeline();

      const result = await pipeline.execute({
        bookingId: 'bk-test-2',
        tripId: 'trip-test-2',
        parcelId: 'parcel-test-2',
        senderId: 'user-sender-2',
        travellerId: 'user-traveler-2',
        amount: 1200,
        weightKg: 25,
        availableCapacityKg: 10,
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.status, 'CAPACITY_EXCEEDED');
      assert.match(result.error ?? '', /Trip capacity exceeded/);
    });
  });

  describe('Delivery Handover Pipeline', () => {
    it('completes multi-stage custody handover and releases escrow upon OTP verification', async () => {
      const pipeline = new DeliveryHandoverPipeline();

      const state: HandoverState = {
        parcelId: 'parcel-handover-1',
        senderId: 'sender-1',
        travellerId: 'traveler-1',
        recipientPhone: '+919876543210',
        payoutAmount: 750,
        status: 'PENDING_PICKUP',
      };

      // 1. Sender initiates pickup
      const { state: pickupState, plainOtp: pickupOtp } = pipeline.initiatePickup(state);
      assert.strictEqual(pickupOtp.length, 6);
      assert.ok(pickupState.pickupOtpHash);

      // 2. Traveler verifies pickup OTP
      const pickupResult = pipeline.verifyPickup(pickupState, pickupOtp);
      assert.strictEqual(pickupResult.success, true);
      assert.strictEqual(pickupResult.status, 'IN_TRANSIT');

      // 3. Recipient delivery initiation
      const { state: transitState, plainOtp: deliveryOtp } = pipeline.initiateDelivery(pickupState);
      assert.strictEqual(deliveryOtp.length, 6);
      assert.ok(transitState.deliveryOtpHash);

      // 4. Traveler verifies delivery OTP and releases payout
      const deliveryResult = await pipeline.verifyDeliveryAndReleaseEscrow(
        transitState,
        deliveryOtp,
        'payout-idem-1',
      );

      assert.strictEqual(deliveryResult.success, true);
      assert.strictEqual(deliveryResult.status, 'SETTLED');
      assert.ok(deliveryResult.payoutTransactionId);
    });

    it('rejects handover when invalid OTP is supplied', async () => {
      const pipeline = new DeliveryHandoverPipeline();
      const state: HandoverState = {
        parcelId: 'parcel-handover-2',
        senderId: 'sender-2',
        travellerId: 'traveler-2',
        recipientPhone: '+919876543210',
        payoutAmount: 500,
        status: 'PENDING_PICKUP',
      };

      const { state: pickupState } = pipeline.initiatePickup(state);
      const invalidResult = pipeline.verifyPickup(pickupState, '000000');
      assert.strictEqual(invalidResult.success, false);
      assert.match(invalidResult.error ?? '', /Invalid pickup OTP/);
    });
  });

  describe('Notification Fanout Pipeline', () => {
    it('processes batch stream of events and records telemetry', async () => {
      const pipeline = new NotificationFanoutPipeline();
      pipeline.resetStats();

      const events = [
        {
          topic: 'trip.created',
          entityType: 'trip',
          entityId: 'trip-batch-1',
          payload: { fromCity: 'Delhi', toCity: 'Agra', matchedTokens: ['ExponentPushToken[1]'] },
        },
        {
          topic: 'booking.escrow_locked',
          entityType: 'booking',
          entityId: 'bk-batch-1',
          payload: { amount: 600, senderEmail: 'test@carrygo.in' },
        },
      ];

      const stats = await pipeline.processBatch(events);
      assert.strictEqual(stats.receivedCount, 2);
      assert.strictEqual(stats.routedPush, 1);
      assert.strictEqual(stats.routedEmail, 1);
      assert.strictEqual(stats.failedRoutes, 0);
    });
  });
});
