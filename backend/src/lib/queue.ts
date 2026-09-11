import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { config } from '../config';

const sqs = new SQSClient({
  maxAttempts: 3,
});

export interface DomainEvent<T = Record<string, unknown>> {
  topic: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  payload: T;
  timestamp?: string;
}

/**
 * Enqueue domain events asynchronously into SQS for background worker processing.
 * Isolates side-effects (push notifications, smart matching, email, auditing)
 * away from the synchronous HTTP request path.
 */
export const enqueueDomainEvent = async <T = Record<string, unknown>>(
  event: DomainEvent<T>,
): Promise<boolean> => {
  const queueUrl = config.asyncQueueUrl;
  const payloadWithMeta = {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString(),
  };

  if (!queueUrl) {
    if (config.appEnv !== 'test') {
      console.log('queue.mock_enqueue', payloadWithMeta);
    }
    return true;
  }

  try {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(payloadWithMeta),
        MessageAttributes: {
          topic: {
            DataType: 'String',
            StringValue: event.topic,
          },
          entityType: {
            DataType: 'String',
            StringValue: event.entityType,
          },
        },
      }),
    );
    return true;
  } catch (error) {
    // Non-blocking: Log failure without breaking the user's synchronous transaction
    console.error('queue.enqueue_failed', {
      topic: event.topic,
      entityId: event.entityId,
      error,
    });
    return false;
  }
};
