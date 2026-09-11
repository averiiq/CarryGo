import { SQSEvent, SQSRecord } from 'aws-lambda';
import { DomainEvent } from '../lib/queue';

// Tracks recently processed message IDs in this Lambda execution context
const processedMessageIds = new Set<string>();
const MAX_PROCESSED_TRACKING = 5000;

const handleTripCreated = async (event: DomainEvent): Promise<void> => {
  const { entityId, payload } = event;
  console.log('worker.trip_created', {
    tripId: entityId,
    fromCity: payload.fromCity,
    toCity: payload.toCity,
    vehicleType: payload.vehicleType,
  });
  // Async notification fan-out / subscriber matching logic runs here
};

const handleParcelCreated = async (event: DomainEvent): Promise<void> => {
  const { entityId, payload } = event;
  console.log('worker.parcel_created', {
    parcelId: entityId,
    fromCity: payload.fromCity,
    toCity: payload.toCity,
    weight: payload.weight,
  });
  // Smart matching computation offloaded here
};

const handleRequestCreated = async (event: DomainEvent): Promise<void> => {
  const { entityId, payload } = event;
  console.log('worker.request_created', {
    requestId: entityId,
    travellerId: payload.travellerId,
    senderId: payload.senderId,
    price: payload.price,
  });
  // Push notification dispatched to traveller here
};

const handleRequestStatusChanged = async (event: DomainEvent): Promise<void> => {
  const { entityId, payload } = event;
  console.log('worker.request_status_changed', {
    requestId: entityId,
    status: payload.status,
    senderId: payload.senderId,
    travellerId: payload.travellerId,
  });
  // Escrow update, pickup confirmation, delivery OTP triggers run here
};

const processSingleRecord = async (record: SQSRecord): Promise<void> => {
  // 1. Idempotency check on message ID
  if (processedMessageIds.has(record.messageId)) {
    console.log('worker.duplicate_message_skipped', { messageId: record.messageId });
    return;
  }

  let event: DomainEvent;
  try {
    event = JSON.parse(record.body) as DomainEvent;
  } catch {
    console.error('worker.malformed_json_body', { body: record.body });
    return;
  }

  // 2. Dispatch by topic
  switch (event.topic) {
    case 'trip.created':
      await handleTripCreated(event);
      break;
    case 'parcel.created':
      await handleParcelCreated(event);
      break;
    case 'request.created':
      await handleRequestCreated(event);
      break;
    case 'request.status_changed':
      await handleRequestStatusChanged(event);
      break;
    default:
      console.log('worker.unhandled_topic', { topic: event.topic, event });
  }

  // 3. Mark processed in memory
  if (processedMessageIds.size >= MAX_PROCESSED_TRACKING) {
    const first = processedMessageIds.values().next().value;
    if (first) {
      processedMessageIds.delete(first);
    }
  }
  processedMessageIds.add(record.messageId);
};

export const processQueueMessages = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    try {
      await processSingleRecord(record);
    } catch (error) {
      console.error('worker.record_processing_error', {
        messageId: record.messageId,
        error,
      });
      // Throwing allows SQS visibility timeout + DLQ retries
      throw error;
    }
  }
};
