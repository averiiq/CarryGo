const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const config = {
  appEnv: process.env.APP_ENV ?? 'dev',
  coreTableName: required('CORE_TABLE_NAME'),
  uploadsBucketName: process.env.UPLOADS_BUCKET_NAME,
  asyncQueueUrl: process.env.ASYNC_QUEUE_URL,
  notificationsTopicArn: process.env.NOTIFICATIONS_TOPIC_ARN,
  eventBusName: process.env.EVENT_BUS_NAME,
};

