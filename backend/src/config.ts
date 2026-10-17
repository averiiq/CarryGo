const getOrFallback = (name: string, fallback: string): string => {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === 'test' || process.env.APP_ENV === 'test') {
      return fallback;
    }
    return fallback;
  }
  return value;
};

export const config = {
  appEnv: process.env.APP_ENV ?? 'dev',
  coreTableName: getOrFallback('CORE_TABLE_NAME', 'carrygo-core-table'),
  uploadsBucketName: process.env.UPLOADS_BUCKET_NAME,
  asyncQueueUrl: process.env.ASYNC_QUEUE_URL,
  smsQueueUrl: process.env.SMS_QUEUE_URL,
  emailQueueUrl: process.env.EMAIL_QUEUE_URL,
  pushQueueUrl: process.env.PUSH_QUEUE_URL,
  notificationsTopicArn: process.env.NOTIFICATIONS_TOPIC_ARN,
  eventBusName: process.env.EVENT_BUS_NAME,
  sandboxWebhookSecret: process.env.SANDBOX_WEBHOOK_SECRET,
  redisUrl: process.env.REDIS_URL,
};



