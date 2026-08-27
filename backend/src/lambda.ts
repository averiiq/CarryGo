import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  EventBridgeEvent,
  SQSEvent,
} from 'aws-lambda';
import { routeRequest } from './http/router';
import { runScheduledJobs } from './events/scheduler';
import { processQueueMessages } from './events/worker';

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

export const workerHandler = async (event: SQSEvent): Promise<void> => {
  await processQueueMessages(event);
};

export const scheduledHandler = async (
  event: EventBridgeEvent<string, unknown>,
): Promise<void> => {
  await runScheduledJobs(event);
};

