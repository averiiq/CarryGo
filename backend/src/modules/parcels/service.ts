import { randomUUID } from 'crypto';
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb } from '../../lib/dynamo';
import { config } from '../../config';

export type ParcelStatus =
  | 'open'
  | 'matched'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface ParcelItem {
  id: string;
  userId: string;
  userName: string;
  fromCity: string;
  toCity: string;
  category: 'documents' | 'electronics' | 'clothing' | 'food' | 'medicine' | 'other';
  description: string;
  deliveryDate?: string;
  weight: number;
  priceOffer: number;
  imageUri?: string;
  imageUris?: string[];
  status: ParcelStatus;
  createdAt: string;
}

interface ListParcelsFilters {
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

const toParcel = (item: Record<string, unknown>): ParcelItem => {
  const imageUris = Array.isArray(item.imageUris)
    ? (item.imageUris as string[])
    : undefined;
  const imageUri = typeof item.imageUri === 'string' ? item.imageUri : imageUris?.[0];

  return {
    id: String(item.id),
    userId: String(item.userId),
    userName: String(item.userName),
    fromCity: String(item.fromCity),
    toCity: String(item.toCity),
    category: item.category as ParcelItem['category'],
    description: String(item.description),
    deliveryDate:
      typeof item.deliveryDate === 'string' ? String(item.deliveryDate) : undefined,
    weight: Number(item.weight),
    priceOffer: Number(item.priceOffer),
    imageUri,
    imageUris,
    status: item.status as ParcelStatus,
    createdAt: String(item.createdAt),
  };
};

const queryByStatus = async (status: ParcelStatus, max: number): Promise<ParcelItem[]> => {
  const { Items } = await ddb.send(
    new QueryCommand({
      TableName: config.coreTableName,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `PARCEL#STATUS#${status}`,
      },
      ScanIndexForward: false,
      Limit: max,
    }),
  );

  return (Items ?? [])
    .filter((item) => item.entityType === 'parcel')
    .map((item) => toParcel(item as Record<string, unknown>));
};

export const listParcels = async (
  filters: ListParcelsFilters,
): Promise<{ items: ParcelItem[]; total: number }> => {
  const maxRead = Math.min(filters.limit + filters.offset + 50, 500);
  const [openItems, matchedItems] = await Promise.all([
    queryByStatus('open', maxRead),
    queryByStatus('matched', maxRead),
  ]);

  const fromCity = normalize(filters.fromCity);
  const toCity = normalize(filters.toCity);
  const userCity = normalize(filters.userCity);

  const filtered = [...openItems, ...matchedItems]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((parcel) => {
      if (fromCity && !includesText(parcel.fromCity, fromCity)) {
        return false;
      }

      if (toCity && !includesText(parcel.toCity, toCity)) {
        return false;
      }

      if (userCity && !fromCity && !toCity) {
        return includesText(parcel.fromCity, userCity) || includesText(parcel.toCity, userCity);
      }

      return true;
    });

  return {
    items: filtered.slice(filters.offset, filters.offset + filters.limit),
    total: filtered.length,
  };
};

export const getParcelById = async (parcelId: string): Promise<ParcelItem | null> => {
  const { Item } = await ddb.send(
    new GetCommand({
      TableName: config.coreTableName,
      Key: {
        pk: `PARCEL#${parcelId}`,
        sk: 'META',
      },
    }),
  );

  if (!Item || Item.entityType !== 'parcel') {
    return null;
  }

  return toParcel(Item as Record<string, unknown>);
};

export const createParcel = async (
  payload: Omit<ParcelItem, 'id' | 'createdAt'>,
): Promise<ParcelItem> => {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const item: ParcelItem = {
    id,
    createdAt,
    ...payload,
  };

  await ddb.send(
    new PutCommand({
      TableName: config.coreTableName,
      Item: {
        pk: `PARCEL#${id}`,
        sk: 'META',
        entityType: 'parcel',
        ...item,
        gsi1pk: `PARCEL#STATUS#${item.status}`,
        gsi1sk: `PARCEL#${item.createdAt}#${id}`,
        gsi2pk: `USER#${item.userId}`,
        gsi2sk: `PARCEL#${item.createdAt}#${id}`,
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    }),
  );

  return item;
};

export const updateParcelStatus = async (
  parcelId: string,
  status: ParcelStatus,
  userId: string,
): Promise<{ updated: boolean; error?: string }> => {
  const current = await getParcelById(parcelId);
  if (!current) {
    return { updated: false, error: 'Parcel not found' };
  }

  if (current.userId !== userId) {
    return { updated: false, error: 'Unauthorized' };
  }

  await ddb.send(
    new UpdateCommand({
      TableName: config.coreTableName,
      Key: {
        pk: `PARCEL#${parcelId}`,
        sk: 'META',
      },
      UpdateExpression: 'SET #status = :status, gsi1pk = :gsi1pk',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':gsi1pk': `PARCEL#STATUS#${status}`,
      },
      ConditionExpression: 'attribute_exists(pk)',
    }),
  );

  return { updated: true };
};

