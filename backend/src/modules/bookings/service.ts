import { randomUUID } from 'crypto';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../../lib/dynamo';
import { config } from '../../config';
import { ReserveBookingCommand } from './types';

export class BookingConflictError extends Error {}

export interface ReserveBookingResult {
  bookingId: string;
  status: 'reserved';
}

export const reserveBooking = async (
  command: ReserveBookingCommand,
): Promise<ReserveBookingResult> => {
  const bookingId = randomUUID();
  const now = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            ConditionCheck: {
              TableName: config.coreTableName,
              Key: {
                pk: `IDEMPOTENCY#${command.idempotencyKey}`,
                sk: 'BOOKING_RESERVE',
              },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
          {
            Update: {
              TableName: config.coreTableName,
              Key: {
                pk: `TRIP#${command.tripId}`,
                sk: 'META',
              },
              UpdateExpression:
                'SET capacityRemaining = capacityRemaining - :units, updatedAt = :now',
              ConditionExpression: 'attribute_exists(pk) AND capacityRemaining >= :units',
              ExpressionAttributeValues: {
                ':units': command.units,
                ':now': now,
              },
            },
          },
          {
            Put: {
              TableName: config.coreTableName,
              Item: {
                pk: `BOOKING#${bookingId}`,
                sk: 'META',
                bookingId,
                tripId: command.tripId,
                senderId: command.senderId,
                units: command.units,
                status: 'reserved',
                createdAt: now,
                gsi1pk: `TRIP#${command.tripId}`,
                gsi1sk: `BOOKING#${now}#${bookingId}`,
                gsi2pk: `USER#${command.senderId}`,
                gsi2sk: `BOOKING#${now}#${bookingId}`,
              },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
          {
            Put: {
              TableName: config.coreTableName,
              Item: {
                pk: `IDEMPOTENCY#${command.idempotencyKey}`,
                sk: 'BOOKING_RESERVE',
                bookingId,
                createdAt: now,
                ttl: expiresAt,
              },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
        ],
      }),
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'TransactionCanceledException' ||
        error.name === 'ConditionalCheckFailedException')
    ) {
      throw new BookingConflictError(
        'Duplicate request or insufficient capacity for this trip.',
      );
    }

    throw error;
  }

  return {
    bookingId,
    status: 'reserved',
  };
};
