import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'https';

const requestHandler = new NodeHttpHandler({
  connectionTimeout: 3000,
  requestTimeout: 5000,
  httpsAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 100,
    keepAliveMsecs: 60_000,
  }),
});

const client = new DynamoDBClient({
  maxAttempts: 3,
  requestHandler,
});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});
