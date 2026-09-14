import { concurrencyGovernor } from './governor';

export type SystemTier = 0 | 1 | 2 | 3;

export interface DegradationStatus {
  tier: SystemTier;
  tierName: 'NORMAL' | 'ELEVATED' | 'HEAVY_LOAD' | 'CRITICAL_OVERLOAD';
  inFlight: number;
  eventLoopLagMs: number;
  serveStaleReads: boolean;
  deferMatching: boolean;
  shedNonCritical: boolean;
}

/**
 * Adaptive Tiered Degradation Controller:
 * Bends gracefully under extreme traffic surges (e.g. lakhs of requests during marketing campaigns or peak hours)
 * instead of breaking.
 */
export class DegradationController {
  getCurrentStatus(): DegradationStatus {
    const inFlight = concurrencyGovernor.getInFlightCount();
    const lag = concurrencyGovernor.getEventLoopLag();

    let tier: SystemTier = 0;
    let tierName: DegradationStatus['tierName'] = 'NORMAL';
    let serveStaleReads = false;
    let deferMatching = false;
    let shedNonCritical = false;

    if (lag > 100 || inFlight > 2200) {
      tier = 3;
      tierName = 'CRITICAL_OVERLOAD';
      serveStaleReads = true;
      deferMatching = true;
      shedNonCritical = true;
    } else if (lag > 65 || inFlight > 1500) {
      tier = 2;
      tierName = 'HEAVY_LOAD';
      serveStaleReads = true;
      deferMatching = true;
      shedNonCritical = false;
    } else if (lag > 35 || inFlight > 800) {
      tier = 1;
      tierName = 'ELEVATED';
      serveStaleReads = true;
      deferMatching = false;
      shedNonCritical = false;
    }

    return {
      tier,
      tierName,
      inFlight,
      eventLoopLagMs: lag,
      serveStaleReads,
      deferMatching,
      shedNonCritical,
    };
  }

  isCritical(): boolean {
    return this.getCurrentStatus().tier === 3;
  }
}

export const degradationController = new DegradationController();
