import { randomUUID } from 'crypto';
import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb } from '../../lib/dynamo';
import { config } from '../../config';
import { getParcelById } from '../parcels/service';
import { getTripById } from '../trips/service';

export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'failed';

export interface RequestItem {
  id: string;
  parcelId: string;
  tripId: string;
  senderId: string;
  senderName: string;
  travellerId: string;
  travellerName: string;
  status: RequestStatus;
  price: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

const nowIso = () => new Date().toISOString();

const normalizeCity = (value: string): string => value.trim().toLowerCase();

const validateRequestTransition = (
  request: RequestItem,
  status: RequestStatus,
  actorUserId: string,
): string | null => {
  if (status === 'accepted' || status === 'rejected') {
    if (request.status !== 'pending') {
      return `Only pending requests can be ${status}`;
    }
    if (request.travellerId !== actorUserId) {
      return `Only the assigned traveller can ${status} this request`;
    }
    return null;
  }

  if (status === 'cancelled') {
    if (request.status !== 'pending') {
      return 'Only pending requests can be cancelled';
    }
    if (request.senderId !== actorUserId) {
      return 'Only the sender can cancel this request';
    }
    return null;
  }

  if (status === 'completed') {
    if (request.status !== 'accepted') {
      return 'Only accepted requests can be completed';
    }
    if (request.travellerId !== actorUserId) {
      return 'Only the assigned traveller can complete this request';
    }
    return null;
  }

  if (status === 'failed') {
    if (request.status !== 'accepted') {
      return 'Only accepted requests can fail';
    }
    if (request.senderId !== actorUserId && request.travellerId !== actorUserId) {
      return 'Only a request participant can mark this request as failed';
    }
    return null;
  }

  return 'Unsupported request status transition';
};

const toRequest = (item: Record<string, unknown>): RequestItem => ({
  id: String(item.id),
  parcelId: String(item.parcelId),
  tripId: String(item.tripId),
  senderId: String(item.senderId),
  senderName: String(item.senderName),
  travellerId: String(item.travellerId),
  travellerName: String(item.travellerName),
  status: item.status as RequestStatus,
  price: Number(item.price),
  message: typeof item.message === 'string' ? item.message : undefined,
  createdAt: String(item.createdAt),
  updatedAt: String(item.updatedAt),
});

const getRequestMeta = async (requestId: string): Promise<RequestItem | null> => {
  const { Item } = await ddb.send(
    new GetCommand({
      TableName: config.coreTableName,
      Key: {
        pk: `REQUEST#${requestId}`,
        sk: 'META',
      },
    }),
  );

  if (!Item || Item.entityType !== 'request') {
    return null;
  }

  return toRequest(Item as Record<string, unknown>);
};

const listByLookup = async (lookupKey: string): Promise<RequestItem[]> => {
  const { Items } = await ddb.send(
    new QueryCommand({
      TableName: config.coreTableName,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: {
        ':pk': lookupKey,
      },
      ScanIndexForward: false,
      Limit: 500,
    }),
  );

  const requestIds = Array.from(
    new Set(
      (Items ?? [])
        .filter((item) => item.entityType === 'request_lookup')
        .map((item) => String(item.requestId)),
    ),
  );

  if (requestIds.length === 0) {
    return [];
  }

  const batchKeys = requestIds.map((requestId) => ({
    pk: `REQUEST#${requestId}`,
    sk: 'META',
  }));

  const { Responses } = await ddb.send(
    new BatchGetCommand({
      RequestItems: {
        [config.coreTableName]: {
          Keys: batchKeys,
        },
      },
    }),
  );

  return (Responses?.[config.coreTableName] ?? [])
    .filter((item) => item.entityType === 'request')
    .map((item) => toRequest(item as Record<string, unknown>))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const listRequestsForUser = async (
  userId: string,
  limit: number,
  offset: number,
): Promise<{ items: RequestItem[]; total: number }> => {
  const merged = await listByLookup(`REQUEST#USER#${userId}`);

  return {
    items: merged.slice(offset, offset + limit),
    total: merged.length,
  };
};

export const getRequestById = async (requestId: string): Promise<RequestItem | null> =>
  getRequestMeta(requestId);

export const listRequestsByTripId = async (tripId: string): Promise<RequestItem[]> =>
  listByLookup(`REQUEST#TRIP#${tripId}`);

export const listRequestsByParcelId = async (parcelId: string): Promise<RequestItem[]> =>
  listByLookup(`REQUEST#PARCEL#${parcelId}`);

export const listRequestsByStatus = async (
  status: RequestStatus,
  limit: number,
): Promise<RequestItem[]> => {
  const { Items } = await ddb.send(
    new QueryCommand({
      TableName: config.coreTableName,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `REQUEST#STATUS#${status}`,
      },
      ScanIndexForward: false,
      Limit: Math.max(1, Math.min(limit, 200)),
    }),
  );

  return (Items ?? [])
    .filter((item) => item.entityType === 'request')
    .map((item) => toRequest(item as Record<string, unknown>));
};

export const countRequestsByStatus = async (status: RequestStatus): Promise<number> => {
  const { Items } = await ddb.send(
    new QueryCommand({
      TableName: config.coreTableName,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `REQUEST#STATUS#${status}`,
      },
      ScanIndexForward: false,
      Limit: 1000,
    }),
  );

  return (Items ?? []).filter((item) => item.entityType === 'request').length;
};

export const getDisputeDashboardData = async (
  limit: number,
): Promise<{ failedRequests: RequestItem[]; totalResolved: number }> => {
  const [failedRequests, totalResolved] = await Promise.all([
    listRequestsByStatus('failed', limit),
    countRequestsByStatus('completed'),
  ]);

  return {
    failedRequests,
    totalResolved,
  };
};

export const createRequest = async (
  payload: Omit<RequestItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
    status?: RequestStatus;
  },
): Promise<RequestItem> => {
  const [parcel, trip] = await Promise.all([
    getParcelById(payload.parcelId),
    getTripById(payload.tripId),
  ]);

  if (!parcel) {
    throw new Error('Parcel not found');
  }

  if (!trip) {
    throw new Error('Trip not found');
  }

  if (payload.senderId === payload.travellerId) {
    throw new Error('Sender and traveller cannot be the same user');
  }

  if (parcel.userId !== payload.senderId) {
    throw new Error('Only the parcel owner can create this request');
  }

  if (trip.userId !== payload.travellerId) {
    throw new Error('Request traveller must be the trip owner');
  }

  if (parcel.status !== 'open') {
    throw new Error('Parcel is no longer available for requests');
  }

  if (trip.status !== 'active') {
    throw new Error('Trip is no longer active');
  }

  const sameRoute = normalizeCity(parcel.fromCity) === normalizeCity(trip.fromCity)
    && normalizeCity(parcel.toCity) === normalizeCity(trip.toCity);
  if (!sameRoute) {
    throw new Error('Parcel and trip routes must match exactly');
  }

  if (parcel.weight > trip.availableCapacity) {
    throw new Error('Trip does not have enough remaining capacity');
  }

  const id = randomUUID();
  const createdAt = nowIso();
  const item: RequestItem = {
    id,
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
    ...payload,
  };

  await ddb.send(
    new PutCommand({
      TableName: config.coreTableName,
      Item: {
        pk: `REQUEST#${id}`,
        sk: 'META',
        entityType: 'request',
        ...item,
        gsi1pk: `REQUEST#STATUS#${item.status}`,
        gsi1sk: `REQUEST#${item.createdAt}#${id}`,
        gsi2pk: `REQUEST#TRIP#${item.tripId}`,
        gsi2sk: `REQUEST#${item.createdAt}#${id}`,
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    }),
  );

  await ddb.send(
    new PutCommand({
      TableName: config.coreTableName,
      Item: {
        pk: `REQUEST#${id}`,
        sk: `LOOKUP#USER#${item.senderId}`,
        entityType: 'request_lookup',
        requestId: id,
        gsi1pk: `REQUEST#USER#${item.senderId}`,
        gsi1sk: `REQUEST#${item.createdAt}#${id}`,
      },
    }),
  );

  await ddb.send(
    new PutCommand({
      TableName: config.coreTableName,
      Item: {
        pk: `REQUEST#${id}`,
        sk: `LOOKUP#USER#${item.travellerId}`,
        entityType: 'request_lookup',
        requestId: id,
        gsi1pk: `REQUEST#USER#${item.travellerId}`,
        gsi1sk: `REQUEST#${item.createdAt}#${id}`,
      },
    }),
  );

  await ddb.send(
    new PutCommand({
      TableName: config.coreTableName,
      Item: {
        pk: `REQUEST#${id}`,
        sk: `LOOKUP#TRIP#${item.tripId}`,
        entityType: 'request_lookup',
        requestId: id,
        gsi1pk: `REQUEST#TRIP#${item.tripId}`,
        gsi1sk: `REQUEST#${item.createdAt}#${id}`,
      },
    }),
  );

  await ddb.send(
    new PutCommand({
      TableName: config.coreTableName,
      Item: {
        pk: `REQUEST#${id}`,
        sk: `LOOKUP#PARCEL#${item.parcelId}`,
        entityType: 'request_lookup',
        requestId: id,
        gsi1pk: `REQUEST#PARCEL#${item.parcelId}`,
        gsi1sk: `REQUEST#${item.createdAt}#${id}`,
      },
    }),
  );

  return item;
};

export const updateRequestStatus = async (
  requestId: string,
  status: RequestStatus,
  userId: string,
  message?: string,
): Promise<{ updated: boolean; error?: string; item?: RequestItem }> => {
  const current = await getRequestMeta(requestId);
  if (!current) {
    return { updated: false, error: 'Request not found' };
  }

  if (current.senderId !== userId && current.travellerId !== userId) {
    return { updated: false, error: 'Only the sender or assigned traveller can update this request' };
  }
  const transitionError = validateRequestTransition(current, status, userId);
  if (transitionError) {
    return { updated: false, error: transitionError };
  }

  const updatedAt = nowIso();
  const updateExpression =
    typeof message === 'string'
      ? 'SET #status = :status, updatedAt = :updatedAt, gsi1pk = :gsi1pk, message = :message'
      : 'SET #status = :status, updatedAt = :updatedAt, gsi1pk = :gsi1pk';

  const expressionAttributeValues: Record<string, unknown> = {
    ':status': status,
    ':updatedAt': updatedAt,
    ':gsi1pk': `REQUEST#STATUS#${status}`,
  };

  if (typeof message === 'string') {
    expressionAttributeValues[':message'] = message;
  }

  await ddb.send(
    new UpdateCommand({
      TableName: config.coreTableName,
      Key: {
        pk: `REQUEST#${requestId}`,
        sk: 'META',
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(pk)',
    }),
  );

  return {
    updated: true,
    item: {
      ...current,
      status,
      updatedAt,
      message: typeof message === 'string' ? message : current.message,
    },
  };
};
