import { SQSEvent } from 'aws-lambda';

export const processQueueMessages = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    console.log('worker.message.received', {
      messageId: record.messageId,
      body: record.body,
    });
  }
};

