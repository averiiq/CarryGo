import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ApiGateway } from './api-gateway';
import { json } from '../http/response';

describe('Enterprise API Gateway Unit Tests', () => {
  it('correctly matches API routes to designated microservices', () => {
    const gateway = new ApiGateway();

    const tripsRoute = gateway.matchRoute('GET', '/api/trips');
    assert.ok(tripsRoute);
    assert.strictEqual(tripsRoute.serviceName, 'trips-service');
    assert.strictEqual(tripsRoute.rateLimitCategory, 'READ');

    const bookingRoute = gateway.matchRoute('POST', '/api/v1/bookings/reserve');
    assert.ok(bookingRoute);
    assert.strictEqual(bookingRoute.serviceName, 'bookings-service');
    assert.strictEqual(bookingRoute.rateLimitCategory, 'MUTATION');

    const kycRoute = gateway.matchRoute('POST', '/api/kyc/aadhaar/initiate');
    assert.ok(kycRoute);
    assert.strictEqual(kycRoute.serviceName, 'kyc-service');
    assert.strictEqual(kycRoute.rateLimitCategory, 'STRICT_KYC');
  });

  it('routes requests to healthy load-balanced replicas and injects correlation IDs', async () => {
    const gateway = new ApiGateway([
      {
        name: 'trips-service',
        baseUrlTargets: ['http://127.0.0.1:5001', 'http://127.0.0.1:5002'],
        algorithm: 'ROUND_ROBIN',
      },
    ]);

    const res = await gateway.handleRequest({
      method: 'GET',
      path: '/api/trips',
      headers: {
        'x-correlation-id': 'corr-test-123',
      },
      sourceIp: '192.168.1.50',
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['x-correlation-id'], 'corr-test-123');
    assert.ok(res.headers['x-request-id']);
    assert.ok(res.headers['server-timing']);

    const body = JSON.parse(res.body);
    assert.strictEqual(body.proxiedService, 'trips-service');
    assert.match(body.targetReplica, /trips-service-replica-/);
  });

  it('circuit breaker trips open when downstream microservice consistently fails', async () => {
    const gateway = new ApiGateway([
      {
        name: 'kyc-service',
        baseUrlTargets: ['http://127.0.0.1:5003'],
        algorithm: 'ROUND_ROBIN',
        circuitBreakerThreshold: 2,
      },
    ]);

    const failingHandler = async () => {
      throw new Error('Downstream KYC API 500 Failure');
    };

    // First failure
    const res1 = await gateway.handleRequest({
      method: 'POST',
      path: '/api/kyc/test',
      headers: {},
      handlerOverride: failingHandler,
    });
    assert.strictEqual(res1.statusCode, 503);

    // Second failure - trips the breaker
    const res2 = await gateway.handleRequest({
      method: 'POST',
      path: '/api/kyc/test',
      headers: {},
      handlerOverride: failingHandler,
    });
    assert.strictEqual(res2.statusCode, 503);

    // Third call - Fast fails immediately due to OPEN circuit breaker
    const res3 = await gateway.handleRequest({
      method: 'POST',
      path: '/api/kyc/test',
      headers: {},
      handlerOverride: failingHandler,
    });
    assert.strictEqual(res3.statusCode, 503);
    const body = JSON.parse(res3.body);
    assert.match(body.message, /Circuit breaker 'kyc-service-breaker' is OPEN/);
  });

  it('serves gateway health check with registered upstreams', async () => {
    const gateway = new ApiGateway();

    const res = await gateway.handleRequest({
      method: 'GET',
      path: '/health',
      headers: {},
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.status, 'healthy');
    assert.ok(Array.isArray(body.upstreams));
    assert.strictEqual(body.upstreams.length, 5);
  });
});
