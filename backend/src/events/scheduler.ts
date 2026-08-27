import { EventBridgeEvent } from 'aws-lambda';

export const runScheduledJobs = async (
  event: EventBridgeEvent<string, unknown>,
): Promise<void> => {
  console.log('scheduler.tick', {
    id: event.id,
    source: event.source,
    time: event.time,
  });
};

