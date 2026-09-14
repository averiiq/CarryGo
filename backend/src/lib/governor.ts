import { monitorEventLoopDelay, IntervalHistogram } from 'perf_hooks';

export interface GovernorConfig {
  /**
   * Maximum concurrent in-flight requests before load shedding triggers.
   * Default: 2000
   */
  maxConcurrent?: number;

  /**
   * Maximum acceptable event loop delay in milliseconds before shedding load.
   * Node.js event loop delay spikes when CPU is saturated or event queue is backlogged.
   * Default: 80ms
   */
  maxLagMs?: number;
}

export interface CapacityCheck {
  allowed: boolean;
  reason?: 'CONCURRENCY_EXCEEDED' | 'EVENT_LOOP_SATURATED';
  currentInFlight: number;
  eventLoopLagMs: number;
}

/**
 * Concurrency & Backpressure Governor:
 * 1. Continuously tracks active in-flight requests.
 * 2. Monitors Node.js Event Loop Lag using perf_hooks histogram.
 * 3. Sheds excess load proactively with fast HTTP 503 instead of letting the event loop
 *    starve, queue memory uncontrollably, or crash the process.
 */
export class ConcurrencyGovernor {
  private inFlight = 0;
  private readonly maxConcurrent: number;
  private readonly maxLagMs: number;
  private histogram: IntervalHistogram | null = null;
  private fallbackLagMs = 0;

  constructor(config: GovernorConfig = {}) {
    this.maxConcurrent = config.maxConcurrent ?? 2000;
    this.maxLagMs = config.maxLagMs ?? 80;

    try {
      this.histogram = monitorEventLoopDelay({ resolution: 20 });
      this.histogram.enable();
    } catch {
      // Fallback timer-based lag measurement if native histogram isn't available
      this.startFallbackLagMonitor();
    }
  }

  private startFallbackLagMonitor(): void {
    let lastTick = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTick - 50; // Expected ~50ms
      this.fallbackLagMs = Math.max(0, delta);
      lastTick = now;
    }, 50);
    interval.unref();
  }

  getEventLoopLag(): number {
    if (this.histogram) {
      // Histogram returns nanoseconds; convert mean to milliseconds
      return Math.round((this.histogram.mean / 1_000_000) * 100) / 100;
    }
    return this.fallbackLagMs;
  }

  getInFlightCount(): number {
    return this.inFlight;
  }

  /**
   * Check whether system capacity allows servicing another request.
   */
  checkCapacity(): CapacityCheck {
    const lag = this.getEventLoopLag();

    if (this.inFlight >= this.maxConcurrent) {
      return {
        allowed: false,
        reason: 'CONCURRENCY_EXCEEDED',
        currentInFlight: this.inFlight,
        eventLoopLagMs: lag,
      };
    }

    // If event loop lag is severely high, shed new requests to let pending requests drain
    if (lag > this.maxLagMs) {
      return {
        allowed: false,
        reason: 'EVENT_LOOP_SATURATED',
        currentInFlight: this.inFlight,
        eventLoopLagMs: lag,
      };
    }

    return {
      allowed: true,
      currentInFlight: this.inFlight,
      eventLoopLagMs: lag,
    };
  }

  /**
   * Acquire a slot for an in-flight request.
   */
  acquire(): boolean {
    const check = this.checkCapacity();
    if (!check.allowed) {
      return false;
    }

    this.inFlight++;
    return true;
  }

  /**
   * Release an acquired slot when request finishes or errors.
   */
  release(): void {
    if (this.inFlight > 0) {
      this.inFlight--;
    }
  }
}

// Global governor singleton
export const concurrencyGovernor = new ConcurrencyGovernor({
  maxConcurrent: 2500,
  maxLagMs: 85,
});
