import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { json, JsonResponse } from '../../http/response';
import { BookingConflictError, reserveBooking } from './service';
import { ReserveBookingRequest } from './types';
import { getAuthenticatedUserId } from '../../http/auth';

const isValidUnits = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const parseBody = (event: APIGatewayProxyEventV2): ReserveBookingRequest | null => {
  if (!event.body) {
    return null;
  }

  try {
    const parsed = JSON.parse(event.body) as Partial<ReserveBookingRequest>;

    if (
      !parsed.tripId ||
      !parsed.senderId ||
      !isValidUnits(parsed.units)
    ) {
      return null;
    }

    return {
      tripId: parsed.tripId,
      senderId: parsed.senderId,
      units: parsed.units,
    };
  } catch {
    return null;
  }
};

const extractIdempotencyKey = (event: APIGatewayProxyEventV2): string | null => {
  const raw = event.headers['idempotency-key'] ?? event.headers['Idempotency-Key'];
  if (!raw) {
    return null;
  }

  const normalized = raw.trim();
  return normalized.length >= 12 ? normalized : null;
};

export const handleReserveBooking = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, {
      message: 'Authentication required.',
    });
  }

  const body = parseBody(event);
  const idempotencyKey = extractIdempotencyKey(event);

  if (!body || !idempotencyKey) {
    return json(400, {
      message: 'Invalid payload or missing idempotency key.',
    });
  }

  if (body.senderId !== authUserId) {
    return json(403, {
      message: 'Cannot reserve bookings for another user.',
    });
  }

  try {
    const result = await reserveBooking({
      idempotencyKey,
      tripId: body.tripId,
      senderId: body.senderId,
      units: body.units,
    });

    return json(201, result);
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return json(409, {
        message: error.message,
      });
    }

    return json(500, {
      message: 'Unexpected error while reserving booking.',
    });
  }
};
