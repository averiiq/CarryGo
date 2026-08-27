import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { json, JsonResponse } from '../../http/response';
import { parseIntParam, parseJsonBody } from '../../lib/http';
import { getAuthenticatedUserId, hasAdminRole } from '../../http/auth';
import {
  createRequest,
  getDisputeDashboardData,
  getRequestById,
  listRequestsByParcelId,
  listRequestsByTripId,
  listRequestsForUser,
  RequestItem,
  updateRequestStatus,
} from './service';

export const handleListRequests = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  const query = event.queryStringParameters ?? {};
  const limit = parseIntParam(query.limit, 50, 1, 100);
  const offset = parseIntParam(query.offset, 0, 0, 2000);
  const { items, total } = await listRequestsForUser(authUserId, limit, offset);

  return json(200, {
    data: items,
    total,
  });
};

export const handleGetRequest = async (
  event: APIGatewayProxyEventV2,
  requestId: string,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  const item = await getRequestById(requestId);
  if (!item) {
    return json(404, { message: 'Request not found' });
  }

  const isAdmin = hasAdminRole(event);
  if (!isAdmin && item.senderId !== authUserId && item.travellerId !== authUserId) {
    return json(403, { message: 'Not authorized to view this request' });
  }

  return json(200, { data: item });
};

export const handleCreateRequest = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  const payload = parseJsonBody<
    Omit<RequestItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
      status?: RequestItem['status'];
    }
  >(event.body);
  if (!payload) {
    return json(400, { message: 'Invalid request payload' });
  }

  if (!payload.parcelId || !payload.tripId || !payload.senderId || !payload.travellerId) {
    return json(400, { message: 'Missing required request fields' });
  }

  if (payload.senderId !== authUserId) {
    return json(403, { message: 'Cannot create a request for another sender' });
  }

  if (payload.price <= 0) {
    return json(400, { message: 'Price must be greater than 0' });
  }

  try {
    const created = await createRequest(payload);
    return json(201, { data: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create request';
    return json(400, { message });
  }
};

export const handleListRequestsByTrip = async (
  event: APIGatewayProxyEventV2,
  tripId: string,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  const isAdmin = hasAdminRole(event);
  const items = await listRequestsByTripId(tripId);
  return json(200, {
    data: isAdmin
      ? items
      : items.filter(
          (item) => item.senderId === authUserId || item.travellerId === authUserId,
        ),
  });
};

export const handleListRequestsByParcel = async (
  event: APIGatewayProxyEventV2,
  parcelId: string,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  const isAdmin = hasAdminRole(event);
  const items = await listRequestsByParcelId(parcelId);
  return json(200, {
    data: isAdmin
      ? items
      : items.filter(
          (item) => item.senderId === authUserId || item.travellerId === authUserId,
        ),
  });
};

export const handleUpdateRequestStatus = async (
  requestId: string,
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  const payload = parseJsonBody<{
    status?: RequestItem['status'];
    message?: string;
  }>(event.body);
  if (!payload?.status) {
    return json(400, { message: 'status is required' });
  }

  const result = await updateRequestStatus(
    requestId,
    payload.status,
    authUserId,
    payload.message,
  );
  if (!result.updated) {
    const message = result.error ?? 'Failed to update request status';
    const statusCode = message === 'Request not found'
      ? 404
      : message.startsWith('Only')
        ? 403
        : 400;

    return json(statusCode, { message });
  }

  return json(200, {
    data: result.item,
  });
};

export const handleDisputesOverview = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const authUserId = getAuthenticatedUserId(event);
  if (!authUserId) {
    return json(401, { message: 'Authentication required' });
  }

  if (!hasAdminRole(event)) {
    return json(403, { message: 'Admin access required' });
  }

  const query = event.queryStringParameters ?? {};
  const limit = parseIntParam(query.limit, 50, 1, 200);
  const data = await getDisputeDashboardData(limit);

  return json(200, {
    data,
  });
};
