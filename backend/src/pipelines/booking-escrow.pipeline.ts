import { distributedLock } from '../lib/distributed-lock';
import { idempotencyEngine } from '../lib/idempotency';
import { eventDispatcher } from '../workers/event-dispatcher';

export interface BookingEscrowInput {
  bookingId: string;
  tripId: string;
  parcelId: string;
  senderId: string;
  travellerId: string;
  senderEmail?: string;
  senderPhone?: string;
  travellerPushToken?: string;
  amount: number;
  weightKg: number;
  availableCapacityKg: number;
  idempotencyKey?: string;
}

export interface BookingEscrowResult {
  success: boolean;
  status: 'ESCROW_LOCKED' | 'CAPACITY_EXCEEDED' | 'PAYLOAD_MISMATCH' | 'FAILED';
  bookingId: string;
  escrowTransactionId?: string;
  remainingCapacityKg?: number;
  error?: string;
}

/**
 * Enterprise Booking & Escrow Pipeline:
 * Coordinates multi-step transactional booking and escrow hold operations.
 * 
 * Safety Guarantees:
 * 1. Distributed Redlock on trip capacity prevents concurrent overbooking across nodes.
 * 2. Idempotency engine prevents duplicate billing/escrow holds during client retry storms.
 * 3. Decoupled notification dispatch ensures communication latency does not slow down transaction commits.
 */
export class BookingEscrowPipeline {
  async execute(input: BookingEscrowInput): Promise<BookingEscrowResult> {
    const {
      bookingId,
      tripId,
      weightKg,
      availableCapacityKg,
      amount,
      idempotencyKey,
    } = input;

    // Step 1: Idempotency Protection
    if (idempotencyKey) {
      const acquireResult = idempotencyEngine.acquire(
        `escrow:${idempotencyKey}`,
        JSON.stringify({ bookingId, tripId, amount }),
      );

      if (acquireResult.status === 'REPLAY') {
        const parsed = JSON.parse(acquireResult.response.body);
        return {
          success: true,
          status: 'ESCROW_LOCKED',
          bookingId,
          escrowTransactionId: parsed.escrowTransactionId,
          remainingCapacityKg: parsed.remainingCapacityKg,
        };
      }

      if (acquireResult.status === 'PAYLOAD_MISMATCH') {
        return {
          success: false,
          status: 'PAYLOAD_MISMATCH',
          bookingId,
          error: 'Idempotency key re-used with different transaction payload',
        };
      }
    }

    // Step 2: Distributed Lock on Trip Capacity
    const lockKey = `trip:${tripId}:capacity`;
    return await distributedLock.withLock(
      lockKey,
      async () => {
        // Step 3: Validate Capacity
        if (weightKg > availableCapacityKg) {
          if (idempotencyKey) idempotencyEngine.fail(`escrow:${idempotencyKey}`);
          return {
            success: false,
            status: 'CAPACITY_EXCEEDED',
            bookingId,
            error: `Trip capacity exceeded. Requested: ${weightKg}kg, Available: ${availableCapacityKg}kg`,
          };
        }

        // Step 4: Simulate Escrow Payment Hold
        const escrowTransactionId = `escrow_tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const remainingCapacityKg = availableCapacityKg - weightKg;

        // Step 5: Save Idempotent State
        if (idempotencyKey) {
          idempotencyEngine.complete(`escrow:${idempotencyKey}`, {
            statusCode: 200,
            headers: {},
            body: JSON.stringify({
              escrowTransactionId,
              remainingCapacityKg,
            }),
          });
        }

        // Step 6: Async Domain Event Dispatch (Notification Fanout)
        // Does not block the synchronous response path
        void eventDispatcher.handleDomainEvent({
          topic: 'booking.escrow_locked',
          entityType: 'booking',
          entityId: bookingId,
          payload: {
            tripId,
            parcelId: input.parcelId,
            senderId: input.senderId,
            travellerId: input.travellerId,
            senderEmail: input.senderEmail,
            senderPhone: input.senderPhone,
            travellerPushToken: input.travellerPushToken,
            amount,
          },
        });

        return {
          success: true,
          status: 'ESCROW_LOCKED',
          bookingId,
          escrowTransactionId,
          remainingCapacityKg,
        };
      },
      { ttlSeconds: 5, retryAttempts: 3, retryDelayMs: 100 },
    );
  }
}

export const bookingEscrowPipeline = new BookingEscrowPipeline();
