export type LoadBalancingAlgorithm = 'ROUND_ROBIN' | 'LEAST_CONNECTIONS' | 'IP_HASH' | 'WEIGHTED_ROUND_ROBIN';

export interface UpstreamTarget {
  id: string;
  host: string;
  port: number;
  weight?: number;
  activeConnections: number;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastHealthCheckTimestamp?: number;
  latencyMs?: number;
}

export interface HealthCheckConfig {
  path: string;
  intervalMs: number;
  timeoutMs: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
}

export interface LoadBalancerOptions {
  algorithm: LoadBalancingAlgorithm;
  healthCheck?: HealthCheckConfig;
  connectionDrainTimeoutMs?: number;
}
