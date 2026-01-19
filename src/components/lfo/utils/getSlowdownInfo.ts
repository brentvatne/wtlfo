/**
 * Calculates slowdown factor and display info for fast LFO visualization.
 *
 * Uses a simple formula: factor = max(1, targetCycleTimeMs / cycleTimeMs)
 * This ensures fast LFOs are always displayed at a comfortable pace (default 250ms).
 */

/**
 * Configuration for slow-motion visualization
 */
export interface SlowdownConfig {
  /** Target minimum cycle time for display (ms). Default: 250 */
  targetCycleTimeMs: number;
  /** Hysteresis margin to prevent flickering (0-1). Default: 0.15 */
  hysteresisMargin: number;
}

export const DEFAULT_SLOWDOWN_CONFIG: SlowdownConfig = {
  targetCycleTimeMs: 500,
  hysteresisMargin: 0.25, // Widened from 0.15 to prevent rapid factor oscillations
};

export interface SlowdownInfo {
  /** Factor to slow down visualization (continuous, >= 1) */
  factor: number;
  /** Actual LFO cycle time in milliseconds */
  actualCycleTimeMs: number;
  /** Displayed cycle time after slowdown (ms) */
  displayCycleTimeMs: number;
  /** Whether slowdown is active (factor > 1) */
  isSlowed: boolean;
}

/**
 * Calculate slowdown info based on cycle time.
 * Always targets the configured minimum display cycle time.
 *
 * Formula: factor = max(1, targetCycleTimeMs / cycleTimeMs)
 */
export function getSlowdownInfo(
  cycleTimeMs: number,
  previousFactor: number = 1,
  config: SlowdownConfig = DEFAULT_SLOWDOWN_CONFIG
): SlowdownInfo {
  const { targetCycleTimeMs, hysteresisMargin } = config;

  // Calculate raw factor needed to reach target cycle time
  const rawFactor = cycleTimeMs > 0 ? targetCycleTimeMs / cycleTimeMs : 1;

  // Only apply slowdown if needed (factor > 1)
  const targetFactor = Math.max(1, rawFactor);

  // Apply hysteresis to prevent flickering near the on/off threshold
  let factor = previousFactor;

  const needsSlowdown = cycleTimeMs < targetCycleTimeMs;
  const wasSlowed = previousFactor > 1;

  if (needsSlowdown !== wasSlowed) {
    // State change (crossing threshold) - apply hysteresis
    if (needsSlowdown) {
      // Getting faster, need slowdown - only if well past threshold
      if (cycleTimeMs < targetCycleTimeMs * (1 - hysteresisMargin)) {
        factor = targetFactor;
      }
    } else {
      // Getting slower, can remove slowdown - only if well past threshold
      if (cycleTimeMs > targetCycleTimeMs * (1 + hysteresisMargin)) {
        factor = 1;
      }
    }
  } else if (wasSlowed) {
    // Still in slowdown mode - update factor smoothly
    factor = targetFactor;
  }

  // Calculate display cycle time
  const displayCycleTimeMs = cycleTimeMs * factor;

  return {
    factor,
    actualCycleTimeMs: cycleTimeMs,
    displayCycleTimeMs,
    isSlowed: factor > 1,
  };
}

/**
 * Simple version without hysteresis (for initial calculation)
 */
export function getSlowdownFactor(
  cycleTimeMs: number,
  targetCycleTimeMs: number = DEFAULT_SLOWDOWN_CONFIG.targetCycleTimeMs
): number {
  if (cycleTimeMs <= 0) return 1;
  return Math.max(1, targetCycleTimeMs / cycleTimeMs);
}
