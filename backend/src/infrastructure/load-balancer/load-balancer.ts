import { UpstreamTarget, LoadBalancingAlgorithm, LoadBalancerOptions, HealthCheckConfig } from './types';

/**
 * High-performance, production-grade Load Balancer
 * Supports:
 * - Round Robin
 * - Least Connections
 * - IP Hash (Session Affinity)
 * - Weighted Round Robin
 * - Active background health checking
 * - Connection tracking & graceful connection draining
 */
export class LoadBalancer {
  private targets: UpstreamTarget[] = [];
  private algorithm: LoadBalancingAlgorithm;
  private rrIndex = 0;
  private healthCheckConfig?: HealthCheckConfig;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private drainingTargets = new Set<string>();

  constructor(targets: UpstreamTarget[], options: LoadBalancerOptions) {
    this.targets = targets.map(t => ({
      ...t,
      weight: t.weight ?? 1,
      activeConnections: t.activeConnections ?? 0,
      isHealthy: t.isHealthy ?? true,
      consecutiveFailures: 0,
    }));
    this.algorithm = options.algorithm;
    this.healthCheckConfig = options.healthCheck;

    if (this.healthCheckConfig) {
      this.startHealthChecks();
    }
  }

  public setAlgorithm(algorithm: LoadBalancingAlgorithm): void {
    this.algorithm = algorithm;
  }

  public getTargets(): readonly UpstreamTarget[] {
    return this.targets;
  }

  public addTarget(target: UpstreamTarget): void {
    const existing = this.targets.find(t => t.id === target.id);
    if (!existing) {
      this.targets.push({
        ...target,
        weight: target.weight ?? 1,
        activeConnections: 0,
        isHealthy: true,
        consecutiveFailures: 0,
      });
    }
  }

  public removeTarget(targetId: string, immediate = false): void {
    if (immediate) {
      this.targets = this.targets.filter(t => t.id !== targetId);
      this.drainingTargets.delete(targetId);
      return;
    }

    // Graceful connection draining
    this.drainingTargets.add(targetId);
    const target = this.targets.find(t => t.id === targetId);
    if (target && target.activeConnections <= 0) {
      this.targets = this.targets.filter(t => t.id !== targetId);
      this.drainingTargets.delete(targetId);
    }
  }

  /**
   * Selects an optimal upstream target based on the active algorithm.
   */
  public selectTarget(clientIp?: string): UpstreamTarget {
    const healthyTargets = this.targets.filter(
      t => t.isHealthy && !this.drainingTargets.has(t.id)
    );

    if (healthyTargets.length === 0) {
      // If all healthy targets are down, fallback to any available target
      const fallback = this.targets.find(t => !this.drainingTargets.has(t.id));
      if (!fallback) {
        throw new Error('LoadBalancer: No upstream targets available');
      }
      return fallback;
    }

    switch (this.algorithm) {
      case 'ROUND_ROBIN':
        return this.selectRoundRobin(healthyTargets);

      case 'LEAST_CONNECTIONS':
        return this.selectLeastConnections(healthyTargets);

      case 'IP_HASH':
        return this.selectIpHash(healthyTargets, clientIp);

      case 'WEIGHTED_ROUND_ROBIN':
        return this.selectWeightedRoundRobin(healthyTargets);

      default:
        return this.selectLeastConnections(healthyTargets);
    }
  }

  /**
   * Round Robin: Sequentially distributes load across all targets.
   */
  private selectRoundRobin(healthy: UpstreamTarget[]): UpstreamTarget {
    const selected = healthy[this.rrIndex % healthy.length];
    this.rrIndex = (this.rrIndex + 1) % healthy.length;
    return selected;
  }

  /**
   * Least Connections: Chooses target with minimum active connection count.
   * If tied, breaks tie using round-robin index or lower latency.
   */
  private selectLeastConnections(healthy: UpstreamTarget[]): UpstreamTarget {
    let minTarget = healthy[0];
    let minConns = minTarget.activeConnections;

    for (let i = 1; i < healthy.length; i++) {
      const current = healthy[i];
      if (current.activeConnections < minConns) {
        minTarget = current;
        minConns = current.activeConnections;
      } else if (current.activeConnections === minConns) {
        // Tie breaker: choose the one with lower latency if available
        if ((current.latencyMs ?? 0) < (minTarget.latencyMs ?? 0)) {
          minTarget = current;
        }
      }
    }

    return minTarget;
  }

  /**
   * IP Hash: Hashes client IP to ensure session affinity to the same server.
   */
  private selectIpHash(healthy: UpstreamTarget[], clientIp?: string): UpstreamTarget {
    if (!clientIp) {
      return this.selectRoundRobin(healthy);
    }

    let hash = 0;
    for (let i = 0; i < clientIp.length; i++) {
      hash = (hash << 5) - hash + clientIp.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    const index = Math.abs(hash) % healthy.length;
    return healthy[index];
  }

  /**
   * Weighted Round Robin: Accounts for differing server hardware capacities.
   */
  private selectWeightedRoundRobin(healthy: UpstreamTarget[]): UpstreamTarget {
    const totalWeight = healthy.reduce((acc, t) => acc + (t.weight || 1), 0);
    let randomWeight = Math.floor(Math.random() * totalWeight);

    for (const target of healthy) {
      randomWeight -= target.weight || 1;
      if (randomWeight < 0) {
        return target;
      }
    }

    return healthy[0];
  }

  /**
   * Tracks an active connection lifecycle.
   */
  public acquireConnection(targetId: string): void {
    const target = this.targets.find(t => t.id === targetId);
    if (target) {
      target.activeConnections += 1;
    }
  }

  public releaseConnection(targetId: string, latencyMs?: number): void {
    const target = this.targets.find(t => t.id === targetId);
    if (target) {
      target.activeConnections = Math.max(0, target.activeConnections - 1);
      if (latencyMs !== undefined) {
        // Exponential moving average for target latency
        target.latencyMs = target.latencyMs
          ? Math.round(target.latencyMs * 0.8 + latencyMs * 0.2)
          : latencyMs;
      }

      // Check if target was draining and is now ready for removal
      if (this.drainingTargets.has(targetId) && target.activeConnections === 0) {
        this.targets = this.targets.filter(t => t.id !== targetId);
        this.drainingTargets.delete(targetId);
      }
    }
  }

  /**
   * Records target failures for passive circuit breaking.
   */
  public reportFailure(targetId: string): void {
    const target = this.targets.find(t => t.id === targetId);
    if (target) {
      target.consecutiveFailures += 1;
      const threshold = this.healthCheckConfig?.unhealthyThreshold ?? 3;
      if (target.consecutiveFailures >= threshold) {
        target.isHealthy = false;
      }
    }
  }

  public reportSuccess(targetId: string): void {
    const target = this.targets.find(t => t.id === targetId);
    if (target) {
      target.consecutiveFailures = 0;
      target.isHealthy = true;
    }
  }

  /**
   * Active Background Health Checking Loop
   */
  private startHealthChecks(): void {
    if (!this.healthCheckConfig) return;

    this.healthCheckTimer = setInterval(async () => {
      await this.runHealthChecks();
    }, this.healthCheckConfig.intervalMs);
    this.healthCheckTimer.unref?.();
  }

  public async runHealthChecks(): Promise<void> {
    if (!this.healthCheckConfig) return;

    for (const target of this.targets) {
      const url = `http://${target.host}:${target.port}${this.healthCheckConfig.path}`;
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.healthCheckConfig.timeoutMs);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const latency = Date.now() - start;
          target.latencyMs = latency;
          target.consecutiveFailures = 0;
          target.isHealthy = true;
        } else {
          target.consecutiveFailures += 1;
          if (target.consecutiveFailures >= this.healthCheckConfig.unhealthyThreshold) {
            target.isHealthy = false;
          }
        }
      } catch {
        target.consecutiveFailures += 1;
        if (target.consecutiveFailures >= this.healthCheckConfig.unhealthyThreshold) {
          target.isHealthy = false;
        }
      } finally {
        target.lastHealthCheckTimestamp = Date.now();
      }
    }
  }

  public stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
}
