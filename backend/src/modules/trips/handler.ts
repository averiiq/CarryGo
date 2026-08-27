import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { json, JsonResponse } from '../../http/response';
import { parseIntParam, parseJsonBody } from '../../lib/http';
import { getAuthenticatedUserId } from '../../http/auth';
import {
  createTrip,
  getTripById,
  listTrips,
  updateTripStatus,
  TripItem,
} from './service';

export const handleListTrips = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  const query = event.queryStringParameters ?? {};
  const limit = parseIntParam(query.limit, 50, 1, 100);
  const offset = parseIntParam(query.offset, 0, 0, 2000);

  const { items, total } = await listTrips({
    fromCity: query.fromCity,
    toCity: query.toCity,
    userCity: query.userCity,
    limit,
    offset,
  });

  return json(200, {
    data: items,
    total,
  });
};

export const handleGetTrip = async (
  tripId: string,
): Promise<JsonResponse> => {
  const trip = await getTripById(tripId);
  if (!trip) {
    return json(404, { message: 'Trip not found' });
  }

  return json(200, { data: trip });
};

export const handleCreateTrip = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  const payload = parseJsonBody<Omit<TripItem, 'id' | 'createdAt'>>(event.body);
  if (!payload) {
    return json(400, { message: 'Invalid trip payload' });
  }

  if (!payload.userName || !payload.fromCity || !payload.toCity || !payload.date || !payload.time || !payload.vehicleType) {
    return json(400, { message: 'Missing required trip fields' });
  }

  if (payload.userId && payload.userId !== authUserId) {
    return json(403, { message: 'Cannot create a trip for another user' });
  }

  if (payload.availableCapacity <= 0 || payload.pricePerKg < 0) {
    return json(400, { message: 'Invalid capacity or pricing values' });
  }

  const created = await createTrip({
    ...payload,
    userId: authUserId,
  });
  return json(201, { data: created });
};

export const handleUpdateTripStatus = async (
  tripId: string,
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  const payload = parseJsonBody<{ status?: TripItem['status'] }>(event.body);
  if (!payload?.status) {
    return json(400, { message: 'status is required' });
  }

  const result = await updateTripStatus(tripId, payload.status, authUserId);
  if (!result.updated) {
    return json(result.error === 'Unauthorized' ? 403 : 404, {
      message: result.error,
    });
  }

  return json(200, {
    error: null,
  });
};
