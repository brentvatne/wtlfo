// Expected-value math for LFO hardware verification.
// Extracted verbatim from useLfoVerification.ts (mechanical split, no behavior change).

import type { CapturedCC, CycleAmplitude, FadeResult } from './types';

// ============================================
// FADE VERIFICATION HELPERS
// ============================================

/**
 * Calculate fade cycles - how many LFO cycles for complete fade
 * Replicates the formula from elektron-lfo/src/engine/fade.ts
 *
 * Based on empirical testing against Digitakt II hardware (January 2025):
 * - |FADE| <= 16: Linear region, ~1 cycle at FADE=4, ~2.2 cycles at FADE=16
 * - |FADE| > 16: Exponential slowdown, doubling every ~4.5 units
 * - NO "disabled" threshold - even extreme values fade, just very slowly
 */
export function calculateFadeCycles(fadeValue: number): number {
  if (fadeValue === 0) return 0;

  const absFade = Math.abs(fadeValue);

  // Linear region (|FADE| <= 16): ~1 cycle at FADE=4, ~2.2 cycles at FADE=16
  if (absFade <= 16) {
    return Math.max(0.5, 0.1 * absFade + 0.6);
  }

  // Exponential region (|FADE| > 16): starts at 2.2 cycles at FADE=16
  // Doubles every ~4.5 units of |FADE|
  const baseAt16 = 2.2;
  return baseAt16 * Math.pow(2, (absFade - 16) / 4.5);
}

/**
 * Calculate expected amplitude at a given cycle number
 * @param fadeValue - The FADE parameter (-64 to +63)
 * @param cycleNumber - Which cycle (1-based)
 * @param fullAmplitude - Full amplitude (depth * 2 for CC swing)
 * @returns Expected amplitude at that cycle
 */
export function calculateExpectedAmplitudeAtCycle(
  fadeValue: number,
  cycleNumber: number,
  fullAmplitude: number
): number {
  if (fadeValue === 0) return fullAmplitude;

  const fadeCycles = calculateFadeCycles(fadeValue);
  if (!isFinite(fadeCycles)) return 0; // Disabled fade

  if (fadeValue < 0) {
    // Fade IN: amplitude increases from 0 to full
    // Progress through fade at end of this cycle
    const progress = Math.min(1, cycleNumber / fadeCycles);
    return fullAmplitude * progress;
  } else {
    // Fade OUT: amplitude decreases from full to 0
    // Hardware observation: Cycle 1 has full amplitude, fade starts from cycle 2
    // So we offset the cycle number by 1 for fade-out calculation
    if (cycleNumber <= 1) return fullAmplitude; // First cycle is full amplitude
    const progress = Math.min(1, (cycleNumber - 1) / fadeCycles);
    return fullAmplitude * (1 - progress);
  }
}

/**
 * Detect cycles from CC data using peak/trough detection
 * Returns array of cycle amplitudes (max - min within each cycle window)
 */
export function detectCycleAmplitudes(
  ccData: CapturedCC[],
  expectedCycleMs: number
): { cycle: number; amplitude: number; min: number; max: number }[] {
  if (ccData.length === 0) return [];

  const sorted = [...ccData].sort((a, b) => a.timestamp - b.timestamp);
  const totalDuration = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
  const numCycles = Math.ceil(totalDuration / expectedCycleMs);

  const cycles: { cycle: number; amplitude: number; min: number; max: number }[] = [];

  for (let cycle = 0; cycle < Math.min(numCycles, 20); cycle++) {
    const cycleStart = cycle * expectedCycleMs;
    const cycleEnd = (cycle + 1) * expectedCycleMs;

    const ccsInCycle = sorted.filter(cc =>
      cc.timestamp >= cycleStart && cc.timestamp < cycleEnd
    );

    if (ccsInCycle.length > 0) {
      const values = ccsInCycle.map(cc => cc.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      cycles.push({
        cycle: cycle + 1,
        amplitude: max - min,
        min,
        max,
      });
    }
  }

  return cycles;
}

/**
 * Compare per-cycle amplitudes between Digitakt and engine expectations
 * Returns FadeResult with pass/fail for each cycle and overall
 */
export function compareFadeAmplitudes(
  observedCycles: { cycle: number; amplitude: number; min: number; max: number }[],
  fadeValue: number,
  fullAmplitude: number,
  tolerance: number = 0.35 // 35% tolerance - fade timing varies with cycle length
): FadeResult {
  const cycleAmplitudes: CycleAmplitude[] = [];

  for (const observed of observedCycles) {
    const expected = calculateExpectedAmplitudeAtCycle(
      fadeValue,
      observed.cycle,
      fullAmplitude
    );

    // Pass if within tolerance OR if both are small (< 15 CC)
    const diff = Math.abs(observed.amplitude - expected);
    const toleranceValue = Math.max(fullAmplitude * tolerance, 15); // At least 15 CC tolerance
    const pass = diff <= toleranceValue;

    cycleAmplitudes.push({
      cycle: observed.cycle,
      observedAmplitude: observed.amplitude,
      expectedAmplitude: Math.round(expected),
      pass,
    });
  }

  // Overall pass if at least half of cycles pass (>= 50%)
  // Fade timing can vary significantly with cycle length and other factors
  const passCount = cycleAmplitudes.filter(c => c.pass).length;
  const fadePass = cycleAmplitudes.length > 0 && (passCount / cycleAmplitudes.length) >= 0.5;

  // Generate summary
  const fadeCycles = calculateFadeCycles(fadeValue);
  const direction = fadeValue < 0 ? 'IN' : 'OUT';
  let fadeSummary = `Fade ${direction}: ${passCount}/${cycleAmplitudes.length} cycles match`;
  if (isFinite(fadeCycles)) {
    fadeSummary += ` (${fadeCycles.toFixed(1)} cycles to complete)`;
  }

  return {
    cycleAmplitudes,
    fadePass,
    fadeSummary,
  };
}
