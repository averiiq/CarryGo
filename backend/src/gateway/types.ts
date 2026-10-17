import { JsonResponse } from '../http/response';
import { LoadBalancer } from '../infrastructure/load-balancer/load-balancer';
import { CircuitBreaker } from '../lib/circuit-breaker';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  phone?: string;
  role: 'user' | 'admin' | 'carrier' | 'verified_traveler';
  kycVerified: boolean;
}

export interface GatewayContext {
  requestId: string;
  correlationId: string;
  clientIp: string;
  userAgent?: string;
  user?: AuthenticatedUser;
  startTime: number;
}

export interface MicroserviceConfig {
  name: string;
  baseUrlTargets: string[];
  algorithm: 'ROUND_ROBIN' | 'LEAST_CONNECTIONS';
  timeoutMs?: number;
  circuitBreakerThreshold?: number;
}

export interface MicroserviceUpstream {
  name: string;
  loadBalancer: LoadBalancer;
  circuitBreaker: CircuitBreaker;
}

export interface GatewayRouteMatch {
  serviceName: string;
  servicePath: string;
  requiresAuth: boolean;
  rateLimitCategory: 'READ' | 'MUTATION' | 'STRICT_KYC';
}
