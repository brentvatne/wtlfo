/**
 * Calculates slowdown factor for fast LFO visualization.
 *
 * Uses a simple formula: factor = max(1, targetCycleTimeMs / cycleTimeMs)
 * - factor > 1: slow down fast LFOs to make them visible
 * - factor = 1: display at actual speed (for slow LFOs)
 *
 * This ensures fast LFOs are displayed at a comfortable pace (default 500ms).
 * Slow LFOs are displayed at their actual speed.
 */

/**
 * Configuration for time-warp visualization
 */
export interface SlowdownConfig {
  /** Target cycle time for display (ms). Default: 500 */
  targetCycleTimeMs: number;
  /** Hysteresis margin to prevent flickering (0-1). Default: 0.15 */
  hysteresisMargin: number;
  /** Minimum factor. Default: 1 (no speedup, only slowdown) */
  minFactor: number;
  /** Maximum factor (max slowdown). Default: 32 */
  maxFactor: number;
}

export const DEFAULT_SLOWDOWN_CONFIG: SlowdownConfig = {
  targetCycleTimeMs: 500,
  hysteresisMargin: 0.1,
  minFactor: 1,   // Never speed up (factor >= 1 always)
  maxFactor: 32,  // Don't slow down more than 32x
};

export interface SlowdownInfo {
  /** Factor to time-warp visualization (>1 = slower, <1 = faster) */
  factor: number;
  /** Actual LFO cycle time in milliseconds */
  actualCycleTimeMs: number;
  /** Displayed cycle time after time-warp (ms) */
  displayCycleTimeMs: number;
  /** Whether slowdown is active (factor > 1) */
  isSlowed: boolean;
}

/**
 * Calculate slowdown info based on cycle time.
 * Always targets the configured display cycle time.
 *
 * Formula: factor = clamp(targetCycleTimeMs / cycleTimeMs, minFactor, maxFactor)
 *
 * NOTE: Feature is currently disabled - always returns factor=1.
 * Set ENABLE_SLOWDOWN to true to re-enable.
 */
const ENABLE_SLOWDOWN = false;

export function getSlowdownInfo(
  cycleTimeMs: number,
  previousFactor: number = 1,
  config: SlowdownConfig = DEFAULT_SLOWDOWN_CONFIG
): SlowdownInfo {
  // Feature disabled - return passthrough values
  if (!ENABLE_SLOWDOWN) {
    return {
      factor: 1,
      actualCycleTimeMs: cycleTimeMs,
      displayCycleTimeMs: cycleTimeMs,
      isSlowed: false,
    };
  }

  const { targetCycleTimeMs, hysteresisMargin, minFactor, maxFactor } = config;

  // Calculate raw factor needed to reach target cycle time
  const rawFactor = cycleTimeMs > 0 ? targetCycleTimeMs / cycleTimeMs : 1;

  // Clamp to min/max bounds
  const targetFactor = Math.max(minFactor, Math.min(maxFactor, rawFactor));

  // Apply hysteresis only near factor=1 to prevent flickering
  let factor = targetFactor;

  const isNearUnity = Math.abs(rawFactor - 1) < hysteresisMargin;
  const wasNearUnity = Math.abs(previousFactor - 1) < 0.01;

  if (isNearUnity && !wasNearUnity) {
    // Approaching 1 - snap to 1 to prevent oscillation
    factor = 1;
  } else if (isNearUnity && wasNearUnity) {
    // Stay at 1 if we were already there
    factor = 1;
  }

  // Calculate display cycle time
  const displayCycleTimeMs = cycleTimeMs * factor;

  return {
    factor,
    actualCycleTimeMs: cycleTimeMs,
    displayCycleTimeMs,
    isSlowed: factor > 1.01,
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
  const { minFactor, maxFactor } = DEFAULT_SLOWDOWN_CONFIG;
  const rawFactor = targetCycleTimeMs / cycleTimeMs;
  return Math.max(minFactor, Math.min(maxFactor, rawFactor));
}
