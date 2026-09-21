import { randomUUID } from 'crypto';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { json, JsonResponse, rateLimited, serviceOverloaded, gatewayTimeout } from './response';
import { concurrencyGovernor } from '../lib/governor';
import { idempotencyEngine } from '../lib/idempotency';
import {
  handleHealth,
  handleHealthLive,
  handleHealthReady,
  handleHealthMetrics,
} from '../modules/health/handler';
import { handleReserveBooking } from '../modules/bookings/handler';
import {
  handleCreateTrip,
  handleGetTrip,
  handleListTrips,
  handleUpdateTripStatus,
} from '../modules/trips/handler';
import {
  handleCreateParcel,
  handleGetParcel,
  handleListParcels,
  handleUpdateParcelStatus,
} from '../modules/parcels/handler';
import {
  handleCreateRequest,
  handleDisputesOverview,
  handleGetRequest,
  handleListRequests,
  handleListRequestsByParcel,
  handleListRequestsByTrip,
  handleUpdateRequestStatus,
} from '../modules/requests/handler';
import {
  handleInitiateAadhaar,
  handleVerifyAadhaar,
  handleRegisterSelfie,
  handleVerifyPan,
  handleSkipPan,
  handleGetKycStatus,
  handleSandboxWebhook,
} from '../modules/kyc/handler';
import {
  globalApiRateLimiter,
  mutationRateLimiter,
  kycRateLimiter,
} from '../lib/rate-limiter';

const normalizePath = (rawPath: string): string => {
  if (rawPath.startsWith('/api/')) {
    return rawPath.replace('/api', '');
  }

  return rawPath;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('GATEWAY_TIMEOUT')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
};

export const routeRequest = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const startTime = performance.now();
  const requestId =
    event.requestContext?.requestId ??
    event.headers['x-request-id'] ??
    event.headers['X-Request-Id'] ??
    randomUUID();

  const method = event.requestContext.http.method;
  const path = normalizePath(event.rawPath);
  const sourceIp = event.requestContext.http.sourceIp ?? 'unknown';

  // 1. Adaptive Load Shedding (Concurrency Governor & Event Loop Protection)
  const isHealth = path.startsWith('/health');
  if (!isHealth && !concurrencyGovernor.acquire()) {
    const lag = concurrencyGovernor.getEventLoopLag();
    console.warn(`[LoadShedder] Dropped ${method} ${path}. InFlight: ${concurrencyGovernor.getInFlightCount()}, Lag: ${lag}ms`);
    return serviceOverloaded(2, requestId);
  }

  try {
    // 2. Sliding window rate limit check (Defends against retry storms & flood attacks)
    // Dedicated stricter rate limit for KYC operations to prevent credential harvesting / abuse
    if (path.startsWith('/kyc/') && path !== '/kyc/sandbox/webhook') {
      const kycCheck = kycRateLimiter.check(`${sourceIp}:KYC`);
      if (!kycCheck.allowed) {
        return rateLimited(kycCheck.retryAfterSeconds, requestId);
      }
    }

    const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
    const rateLimitKey = `${sourceIp}:${isMutation ? 'MUTATION' : 'READ'}`;
    const limiter = isMutation ? mutationRateLimiter : globalApiRateLimiter;
    const rateCheck = limiter.check(rateLimitKey);

    if (!rateCheck.allowed) {
      return rateLimited(rateCheck.retryAfterSeconds, requestId);
    }

    // 3. Enterprise Idempotency Engine for mutation deduplication
    const idempotencyKey = isMutation
      ? event.headers['idempotency-key'] ??
        event.headers['Idempotency-Key'] ??
        event.headers['x-idempotency-key']
      : undefined;

    if (idempotencyKey) {
      const idempResult = idempotencyEngine.acquire(idempotencyKey, event.body || '');
      if (idempResult.status === 'REPLAY') {
        return idempResult.response;
      }
      if (idempResult.status === 'IN_FLIGHT') {
        return json(
          409,
          { message: 'A request with this idempotency key is currently in flight. Please retry shortly.' },
          { requestId },
        );
      }
      if (idempResult.status === 'PAYLOAD_MISMATCH') {
        return json(
          422,
          { message: 'Idempotency key re-used with a different request payload.' },
          { requestId },
        );
      }
    }

    // 4. Dispatch to route handlers with timeout guard (prevents hanging sockets)
    let response: JsonResponse;

    const executeRoute = async (): Promise<JsonResponse> => {
      if (method === 'GET' && (path === '/' || path === '')) {
        response = json(200, {
          service: 'CarryGo AWS Modular Monolith API',
          status: 'operational',
          version: '0.1.0',
          endpoints: {
            health: '/health',
            healthLive: '/health/live',
            healthReady: '/health/ready',
            healthMetrics: '/health/metrics',
            trips: '/trips',
            parcels: '/parcels',
            requests: '/requests',
            reserve: '/bookings/reserve',
            kyc: '/kyc/status',
          },
        });
      } else if (method === 'GET' && path === '/health') {
        response = handleHealth();
      } else if (method === 'GET' && path === '/health/live') {
        response = handleHealthLive();
      } else if (method === 'GET' && path === '/health/ready') {
        response = handleHealthReady();
      } else if (method === 'GET' && path === '/health/metrics') {
        response = handleHealthMetrics();
      } else if (method === 'POST' && path === '/bookings/reserve') {
        response = await handleReserveBooking(event);
      } else if (method === 'GET' && path === '/trips') {
    response = await handleListTrips(event);
  } else if (method === 'POST' && path === '/trips') {
    response = await handleCreateTrip(event);
  } else if (method === 'GET' && path === '/parcels') {
    response = await handleListParcels(event);
  } else if (method === 'POST' && path === '/parcels') {
    response = await handleCreateParcel(event);
  } else if (method === 'GET' && path === '/requests') {
    response = await handleListRequests(event);
  } else if (method === 'POST' && path === '/requests') {
    response = await handleCreateRequest(event);
  } else if (method === 'GET' && path === '/admin/disputes') {
    response = await handleDisputesOverview(event);
  } else if (method === 'POST' && path === '/kyc/aadhaar/initiate') {
    response = await handleInitiateAadhaar(event);
  } else if (method === 'POST' && path === '/kyc/aadhaar/verify') {
    response = await handleVerifyAadhaar(event);
  } else if (method === 'POST' && path === '/kyc/selfie') {
    response = await handleRegisterSelfie(event);
  } else if (method === 'POST' && path === '/kyc/pan/verify') {
    response = await handleVerifyPan(event);
  } else if (method === 'POST' && path === '/kyc/pan/skip') {
    response = await handleSkipPan(event);
  } else if (method === 'GET' && path === '/kyc/status') {
    response = await handleGetKycStatus(event);
  } else if (method === 'POST' && path === '/kyc/sandbox/webhook') {
    response = await handleSandboxWebhook(event);
  } else {
    const tripStatusMatch = path.match(/^\/trips\/([^/]+)\/status$/);
    if (method === 'PATCH' && tripStatusMatch) {
      response = await handleUpdateTripStatus(tripStatusMatch[1], event);
    } else {
      const tripMatch = path.match(/^\/trips\/([^/]+)$/);
      if (method === 'GET' && tripMatch) {
        response = await handleGetTrip(tripMatch[1]);
      } else {
        const parcelStatusMatch = path.match(/^\/parcels\/([^/]+)\/status$/);
        if (method === 'PATCH' && parcelStatusMatch) {
          response = await handleUpdateParcelStatus(parcelStatusMatch[1], event);
        } else {
          const parcelMatch = path.match(/^\/parcels\/([^/]+)$/);
          if (method === 'GET' && parcelMatch) {
            response = await handleGetParcel(parcelMatch[1]);
          } else {
            const requestByTripMatch = path.match(/^\/requests\/by-trip\/([^/]+)$/);
            if (method === 'GET' && requestByTripMatch) {
              response = await handleListRequestsByTrip(event, requestByTripMatch[1]);
            } else {
              const requestByParcelMatch = path.match(/^\/requests\/by-parcel\/([^/]+)$/);
              if (method === 'GET' && requestByParcelMatch) {
                response = await handleListRequestsByParcel(event, requestByParcelMatch[1]);
              } else {
                const requestStatusMatch = path.match(/^\/requests\/([^/]+)\/status$/);
                if (method === 'PATCH' && requestStatusMatch) {
                  response = await handleUpdateRequestStatus(requestStatusMatch[1], event);
                } else {
                  const requestMatch = path.match(/^\/requests\/([^/]+)$/);
                  if (method === 'GET' && requestMatch) {
                    response = await handleGetRequest(event, requestMatch[1]);
                  } else {
                    response = json(404, {
                      message: 'Not found',
                      method,
                      path,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return response;
};

    try {
      response = await withTimeout(executeRoute(), 8000);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'GATEWAY_TIMEOUT') {
        response = gatewayTimeout(requestId);
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Internal server error';
        console.error(`[RouterError] Error in ${method} ${path}:`, err);
        response = json(500, { message: errorMsg }, { requestId });
      }
    }

    if (idempotencyKey && response.statusCode < 500) {
      idempotencyEngine.complete(idempotencyKey, response);
    } else if (idempotencyKey) {
      idempotencyEngine.fail(idempotencyKey);
    }

    // 5. Inject Observability & Tracing headers (p50/p95/p99 tracking)
    const durationMs = performance.now() - startTime;
    response.headers['x-request-id'] = requestId;
    response.headers['server-timing'] = `app;dur=${durationMs.toFixed(2)}`;

    return response;
  } finally {
    if (!isHealth) {
      concurrencyGovernor.release();
    }
  }
};

