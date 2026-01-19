/**
 * Calculates slowdown factor and display info for fast LFO visualization.
 *
 * Thresholds based on human perception limits:
 * - Below 67ms (15+ Hz): Audio rate, needs 16x slowdown
 * - 67-125ms (8-15 Hz): Strobe territory, needs 8x
 * - 125-250ms (4-8 Hz): Fast but trackable with effort, needs 4x
 * - 250-500ms (2-4 Hz): Fast but visible, needs 2x
 * - Above 500ms (< 2 Hz): Natural, no slowdown needed
 */

export interface SlowdownInfo {
  /** Factor to slow down visualization (1, 2, 4, 8, or 16) */
  factor: number;
  /** Actual LFO frequency in Hz */
  frequencyHz: number;
  /** Whether slowdown is active */
  isSlowed: boolean;
}

/**
 * Calculate slowdown info based on cycle time.
 * Uses perception-based thresholds with hysteresis to prevent flickering.
 */
export function getSlowdownInfo(cycleTimeMs: number, previousFactor: number = 1): SlowdownInfo {
  const frequencyHz = cycleTimeMs > 0 ? 1000 / cycleTimeMs : 0;

  // Calculate target factor based on thresholds
  let targetFactor: number;
  if (cycleTimeMs < 67) {
    targetFactor = 16; // 15+ Hz - audio rate
  } else if (cycleTimeMs < 125) {
    targetFactor = 8; // 8-15 Hz - strobe territory
  } else if (cycleTimeMs < 250) {
    targetFactor = 4; // 4-8 Hz - fast
  } else if (cycleTimeMs < 500) {
    targetFactor = 2; // 2-4 Hz - medium-fast
  } else {
    targetFactor = 1; // < 2 Hz - natural
  }

  // Apply hysteresis: only change factor if we cross threshold by 15% margin
  // This prevents flickering when values hover near thresholds
  let factor = previousFactor;

  if (targetFactor !== previousFactor) {
    const hysteresisMargin = 0.15;

    // Check if we've crossed the threshold by enough margin
    if (targetFactor > previousFactor) {
      // Getting faster - need to increase slowdown
      // Only increase if we're well past the threshold
      const threshold = getThresholdForFactor(targetFactor);
      if (cycleTimeMs < threshold * (1 - hysteresisMargin)) {
        factor = targetFactor;
      }
    } else {
      // Getting slower - can decrease slowdown
      // Only decrease if we're well past the threshold
      const threshold = getThresholdForFactor(previousFactor);
      if (cycleTimeMs > threshold * (1 + hysteresisMargin)) {
        factor = targetFactor;
      }
    }
  }

  return {
    factor,
    frequencyHz,
    isSlowed: factor > 1,
  };
}

/**
 * Simple version without hysteresis (for initial calculation)
 */
export function getSlowdownFactor(cycleTimeMs: number): number {
  if (cycleTimeMs < 67) return 16;
  if (cycleTimeMs < 125) return 8;
  if (cycleTimeMs < 250) return 4;
  if (cycleTimeMs < 500) return 2;
  return 1;
}

/**
 * Get the threshold (in ms) that triggers a given factor
 */
function getThresholdForFactor(factor: number): number {
  switch (factor) {
    case 16:
      return 67;
    case 8:
      return 125;
    case 4:
      return 250;
    case 2:
      return 500;
    default:
      return Infinity;
  }
}
