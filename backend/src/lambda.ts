import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  EventBridgeEvent,
  SQSEvent,
} from 'aws-lambda';
import { routeRequest } from './http/router';
import { runScheduledJobs } from './events/scheduler';
import { processQueueMessages } from './events/worker';
import { smsWorkerService } from './workers/sms-worker';
import { emailWorkerService } from './workers/email-worker';
import { pushWorkerService } from './workers/push-worker';

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    return await routeRequest(event);
  } catch (error) {
    console.error('api.unhandled_error', error);
    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        message: 'Internal server error',
      }),
    };
  }
};

/**
 * General Background Event Worker Handler
 */
export const workerHandler = async (event: SQSEvent): Promise<void> => {
  await processQueueMessages(event);
};

/**
 * Dedicated SMS Worker Microservice Handler
 */
export const smsWorkerHandler = async (event: SQSEvent): Promise<void> => {
  const result = await smsWorkerService.processQueueBatch(event);
  if (result.failureCount > 0) {
    console.warn(`[SMSWorker] Processed with ${result.failureCount} errors`, result.errors);
  }
};

/**
 * Dedicated Email Worker Microservice Handler
 */
export const emailWorkerHandler = async (event: SQSEvent): Promise<void> => {
  const result = await emailWorkerService.processQueueBatch(event);
  if (result.failureCount > 0) {
    console.warn(`[EmailWorker] Processed with ${result.failureCount} errors`, result.errors);
  }
};

/**
 * Dedicated Push Notification Worker Microservice Handler
 */
export const pushWorkerHandler = async (event: SQSEvent): Promise<void> => {
  const result = await pushWorkerService.processQueueBatch(event);
  if (result.failureCount > 0) {
    console.warn(`[PushWorker] Processed with ${result.failureCount} errors`, result.errors);
  }
};

export const scheduledHandler = async (
  event: EventBridgeEvent<string, unknown>,
): Promise<void> => {
  await runScheduledJobs(event);
};
