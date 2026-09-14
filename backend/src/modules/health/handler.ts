import { json, JsonResponse } from '../../http/response';
import { concurrencyGovernor } from '../../lib/governor';
import { dynamoDbBreaker, sandboxKycBreaker, supabaseBreaker } from '../../lib/circuit-breaker';
import { l1Cache } from '../../lib/cache';
import { degradationController } from '../../lib/degradation';
import { idempotencyEngine } from '../../lib/idempotency';

export const handleHealth = (): JsonResponse =>
  json(200, {
    status: 'ok',
    service: 'carrygo-backend',
    timestamp: new Date().toISOString(),
  });

export const handleHealthLive = (): JsonResponse =>
  json(200, {
    status: 'live',
    pid: process.pid,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });

export const handleHealthReady = (): JsonResponse => {
  const ddbState = dynamoDbBreaker.getState();
  const kycState = sandboxKycBreaker.getState();
  const supabaseState = supabaseBreaker.getState();

  const isHealthy = ddbState !== 'OPEN' && supabaseState !== 'OPEN';

  return json(
    isHealthy ? 200 : 503,
    {
      status: isHealthy ? 'ready' : 'degraded',
      circuitBreakers: {
        dynamodb: ddbState,
        sandboxKyc: kycState,
        supabase: supabaseState,
      },
      cacheSize: l1Cache.size(),
      timestamp: new Date().toISOString(),
    },
  );
};

export const handleHealthMetrics = (): JsonResponse => {
  const mem = process.memoryUsage();
  const degradation = degradationController.getCurrentStatus();

  return json(200, {
    service: 'carrygo-backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    pid: process.pid,
    concurrency: {
      inFlight: concurrencyGovernor.getInFlightCount(),
      eventLoopLagMs: concurrencyGovernor.getEventLoopLag(),
      degradationTier: degradation.tier,
      tierName: degradation.tierName,
    },
    memory: {
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    },
    circuitBreakers: {
      dynamodb: dynamoDbBreaker.getState(),
      sandboxKyc: sandboxKycBreaker.getState(),
      supabase: supabaseBreaker.getState(),
    },
    cache: l1Cache.getStats(),
    idempotencyStoreSize: idempotencyEngine.size(),
  });
};
