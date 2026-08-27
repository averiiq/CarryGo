import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { json, JsonResponse } from '../../http/response';
import { parseIntParam, parseJsonBody } from '../../lib/http';
import { getAuthenticatedUserId } from '../../http/auth';
import {
  createParcel,
  getParcelById,
  listParcels,
  ParcelItem,
  updateParcelStatus,
} from './service';

export const handleListParcels = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  const query = event.queryStringParameters ?? {};
  const limit = parseIntParam(query.limit, 50, 1, 100);
  const offset = parseIntParam(query.offset, 0, 0, 2000);

  const { items, total } = await listParcels({
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

export const handleGetParcel = async (
  parcelId: string,
): Promise<JsonResponse> => {
  const parcel = await getParcelById(parcelId);
  if (!parcel) {
    return json(404, { message: 'Parcel not found' });
  }

  return json(200, { data: parcel });
};

export const handleCreateParcel = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  const payload = parseJsonBody<Omit<ParcelItem, 'id' | 'createdAt'>>(event.body);
  if (!payload) {
    return json(400, { message: 'Invalid parcel payload' });
  }

  if (!payload.userName || !payload.fromCity || !payload.toCity || !payload.description || !payload.category) {
    return json(400, { message: 'Missing required parcel fields' });
  }

  if (payload.userId && payload.userId !== authUserId) {
    return json(403, { message: 'Cannot create a parcel for another user' });
  }

  if (payload.weight <= 0 || payload.priceOffer < 0) {
    return json(400, { message: 'Invalid parcel weight or pricing values' });
  }

  const created = await createParcel({
    ...payload,
    userId: authUserId,
  });
  return json(201, { data: created });
};

export const handleUpdateParcelStatus = async (
  parcelId: string,
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  const payload = parseJsonBody<{ status?: ParcelItem['status'] }>(event.body);
  if (!payload?.status) {
    return json(400, { message: 'status is required' });
  }

  const result = await updateParcelStatus(parcelId, payload.status, authUserId);
  if (!result.updated) {
    return json(result.error === 'Unauthorized' ? 403 : 404, {
      message: result.error,
    });
  }

  return json(200, {
    error: null,
  });
};
