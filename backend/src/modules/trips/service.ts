import { randomUUID } from 'crypto';
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb } from '../../lib/dynamo';
import { config } from '../../config';

export type TripStatus = 'active' | 'completed' | 'cancelled';

export interface TripItem {
  id: string;
  userId: string;
  userName: string;
  userRating: number;
  fromCity: string;
  toCity: string;
  date: string;
  time: string;
  vehicleType: 'bike' | 'car' | 'bus' | 'train' | 'flight';
  availableCapacity: number;
  pricePerKg: number;
  status: TripStatus;
  createdAt: string;
}

interface ListTripsFilters {
  fromCity?: string;
  toCity?: string;
  userCity?: string;
  limit: number;
  offset: number;
}

const normalize = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.trim().toLowerCase();
};

const includesText = (value: string, search?: string): boolean => {
  if (!search) {
    return true;
  }

  return value.toLowerCase().includes(search);
};

const toTrip = (item: Record<string, unknown>): TripItem => ({
  id: String(item.id),
  userId: String(item.userId),
  userName: String(item.userName),
  userRating: Number(item.userRating ?? 4.5),
  fromCity: String(item.fromCity),
  toCity: String(item.toCity),
  date: String(item.date),
  time: String(item.time),
  vehicleType: item.vehicleType as TripItem['vehicleType'],
  availableCapacity: Number(item.availableCapacity),
  pricePerKg: Number(item.pricePerKg),
  status: item.status as TripStatus,
  createdAt: String(item.createdAt),
});

export const listTrips = async (
  filters: ListTripsFilters,
): Promise<{ items: TripItem[]; total: number }> => {
  const { Items } = await ddb.send(
    new QueryCommand({
      TableName: config.coreTableName,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: {
        ':pk': 'TRIP#STATUS#active',
      },
      ScanIndexForward: false,
      Limit: Math.min(filters.limit + filters.offset + 50, 500),
    }),
  );

  const fromCity = normalize(filters.fromCity);
  const toCity = normalize(filters.toCity);
  const userCity = normalize(filters.userCity);

  const filtered = (Items ?? [])
    .filter((item) => item.entityType === 'trip')
    .map((item) => toTrip(item as Record<string, unknown>))
    .filter((trip) => {
      if (fromCity && !includesText(trip.fromCity, fromCity)) {
        return false;
      }

      if (toCity && !includesText(trip.toCity, toCity)) {
        return false;
      }

      if (userCity && !fromCity && !toCity) {
        return includesText(trip.fromCity, userCity) || includesText(trip.toCity, userCity);
      }

      return true;
    });

  return {
    items: filtered.slice(filters.offset, filters.offset + filters.limit),
    total: filtered.length,
  };
};

export const getTripById = async (tripId: string): Promise<TripItem | null> => {
  const { Item } = await ddb.send(
    new GetCommand({
      TableName: config.coreTableName,
      Key: {
        pk: `TRIP#${tripId}`,
        sk: 'META',
      },
    }),
  );

  if (!Item || Item.entityType !== 'trip') {
    return null;
  }

  return toTrip(Item as Record<string, unknown>);
};

export const createTrip = async (payload: Omit<TripItem, 'id' | 'createdAt'>): Promise<TripItem> => {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const item: TripItem = {
    id,
    createdAt,
    ...payload,
  };

  await ddb.send(
    new PutCommand({
      TableName: config.coreTableName,
      Item: {
        pk: `TRIP#${id}`,
        sk: 'META',
        entityType: 'trip',
        ...item,
        gsi1pk: `TRIP#STATUS#${item.status}`,
        gsi1sk: `TRIP#${item.createdAt}#${id}`,
        gsi2pk: `USER#${item.userId}`,
        gsi2sk: `TRIP#${item.createdAt}#${id}`,
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    }),
  );

  return item;
};

export const updateTripStatus = async (
  tripId: string,
  status: TripStatus,
  userId: string,
): Promise<{ updated: boolean; error?: string }> => {
  const current = await getTripById(tripId);
  if (!current) {
    return { updated: false, error: 'Trip not found' };
  }

  if (current.userId !== userId) {
    return { updated: false, error: 'Unauthorized' };
  }

  await ddb.send(
    new UpdateCommand({
      TableName: config.coreTableName,
      Key: {
        pk: `TRIP#${tripId}`,
        sk: 'META',
      },
      UpdateExpression: 'SET #status = :status, gsi1pk = :gsi1pk',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':gsi1pk': `TRIP#STATUS#${status}`,
      },
      ConditionExpression: 'attribute_exists(pk)',
    }),
  );

  return { updated: true };
};

