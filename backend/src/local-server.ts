import http from 'http';
import cluster from 'cluster';
import os from 'os';
import { randomUUID } from 'crypto';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { routeRequest } from './http/router';

const PORT = parseInt(process.env.PORT || '4000', 10);

export const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  const [rawPath, rawQueryString = ''] = url.split('?');

  const chunks: Buffer[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    const rawBody = Buffer.concat(chunks).toString('utf-8');

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        headers[key.toLowerCase()] = value.join(',');
      }
    }

    const sourceIp =
      headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const queryStringParameters: Record<string, string> = {};
    if (rawQueryString) {
      const searchParams = new URLSearchParams(rawQueryString);
      searchParams.forEach((val, key) => {
        queryStringParameters[key] = val;
      });
    }

    const authHeader = headers['authorization'];
    const userId = headers['x-user-id'] || (authHeader ? '00000000-0000-0000-0000-000000000001' : undefined);
    const authorizer = userId
      ? {
          jwt: {
            claims: {
              sub: userId,
              'cognito:groups': headers['x-role'] === 'admin' ? ['admin'] : ['user'],
              'custom:system_role': headers['x-role'] || 'user',
            },
            scopes: [],
          },
        }
      : undefined;

    const event = {
      version: '2.0',
      routeKey: `${req.method} ${rawPath}`,
      rawPath,
      rawQueryString,
      queryStringParameters: Object.keys(queryStringParameters).length > 0 ? queryStringParameters : undefined,
      headers,
      requestContext: {
        accountId: '123456789012',
        apiId: 'carrygo-local-api',
        domainName: 'localhost',
        domainPrefix: 'localhost',
        http: {
          method: req.method || 'GET',
          path: rawPath,
          protocol: 'HTTP/1.1',
          sourceIp,
          userAgent: headers['user-agent'] || 'autocannon',
        },
        requestId: headers['x-request-id'] || randomUUID(),
        routeKey: `${req.method} ${rawPath}`,
        stage: 'local',
        time: new Date().toISOString(),
        timeEpoch: Date.now(),
        authorizer: authorizer as any,
      },
      body: rawBody || undefined,
      isBase64Encoded: false,
    } as APIGatewayProxyEventV2;

    try {
      const response = await routeRequest(event);
      res.writeHead(response.statusCode, response.headers || {});
      res.end(response.body);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      console.error('Server error:', err);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    }
  });
});

// Configure robust keep-alive & socket parameters for heavy traffic
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Draining connections and shutting down gracefully...`);
  server.close(() => {
    console.log('✅ Server closed cleanly.');
    process.exit(0);
  });

  // Force close after 6 seconds if connections fail to drain
  setTimeout(() => {
    console.warn('⚠️ Force terminating pending connections after timeout.');
    process.exit(0);
  }, 6000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[ProcessUncaughtException]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[ProcessUnhandledRejection]', reason);
});

if (require.main === module || process.argv[1]?.includes('local-server')) {
  const workersEnv = process.env.CLUSTER_WORKERS;
  const numCPUs = os.cpus().length;

  if (workersEnv && cluster.isPrimary) {
    const workerCount =
      workersEnv === 'auto'
        ? Math.min(numCPUs, 4)
        : Math.max(1, parseInt(workersEnv, 10) || 1);

    console.log(`\n👑 CarryGo Primary Process [PID: ${process.pid}] starting ${workerCount} worker(s)...`);

    for (let i = 0; i < workerCount; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      console.warn(`⚠️ Worker [PID: ${worker.process.pid}] exited (${signal || code}). Respawning worker...`);
      cluster.fork();
    });
  } else {
    server.listen(PORT, () => {
      const pidStr = cluster.isWorker ? `Worker [PID: ${process.pid}]` : `Process [PID: ${process.pid}]`;
      console.log(`\n🚀 CarryGo Backend ${pidStr} running on http://localhost:${PORT}`);
      console.log(`   Health endpoint: http://localhost:${PORT}/health`);
      console.log(`   Trips endpoint:  http://localhost:${PORT}/trips`);
      console.log(`   Parcels endpoint: http://localhost:${PORT}/parcels\n`);
    });
  }
}

