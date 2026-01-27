/**
 * Worklet-compatible waveform sampling functions
 *
 * These are copies of the pure functions from elektron-lfo/core with 'worklet'
 * directives added. Worklets run in a separate JS context (UI thread) and cannot
 * import functions from external packages.
 *
 * IMPORTANT: Keep these in sync with elektron-lfo/src/core/waveforms.ts
 * Any changes to the core functions should be reflected here.
 */

import type { WaveformType } from './types';

// ===== RANDOM NUMBER GENERATION =====

/**
 * Seeded PRNG for reproducible random values
 * Uses mulberry32-inspired bit mixing for good distribution
 *
 * Copied from elektron-lfo/core/waveforms.ts
 */
export function seededRandom(step: number, seed: number): number {
  'worklet';
  // Combine step and seed with large primes for good mixing
  let h = ((step * 2654435761) ^ (seed * 1597334677)) >>> 0;
  // Mix bits using Math.imul for 32-bit integer multiplication
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h = (h ^ (h >>> 16)) >>> 0;
  // Convert to [-1, 1] range
  return (h / 2147483648) - 1;
}

/**
 * @deprecated Use seededRandom instead. Kept for backwards compatibility.
 */
export function getRandomStepValue(step: number, seed: number = 0): number {
  'worklet';
  return seededRandom(step, seed);
}

// ===== EXPONENTIAL WAVEFORMS =====

/**
 * EXP decay: 1 → 0, concave (fast drop, slow approach to 0)
 * Used for positive speed
 *
 * Copied from elektron-lfo/core/waveforms.ts
 */
export function sampleExpDecay(phase: number): number {
  'worklet';
  const k = 3;
  const decay = Math.exp(-phase * k);
  const endValue = Math.exp(-k);
  return (decay - endValue) / (1 - endValue);
}

/**
 * EXP rise: 0 → 1, concave (slow rise, fast acceleration to 1)
 * Used for negative speed to maintain concave shape
 *
 * Copied from elektron-lfo/core/waveforms.ts
 */
export function sampleExpRise(phase: number): number {
  'worklet';
  const k = 3;
  return (Math.exp(phase * k) - 1) / (Math.exp(k) - 1);
}

// ===== MAIN SAMPLING FUNCTIONS =====

/**
 * Sample any waveform by type
 * Can be called from within Reanimated worklets (useDerivedValue, useAnimatedStyle, etc.)
 *
 * Copied from elektron-lfo/core/waveforms.ts (sampleWaveform)
 *
 * @param waveform - Waveform type
 * @param phase - Current phase (0-1)
 * @param randomSeed - Seed for RND waveform (changes each cycle)
 */
export function sampleWaveformWorklet(
  waveform: WaveformType,
  phase: number,
  randomSeed: number = 0
): number {
  'worklet';

  switch (waveform) {
    case 'TRI': // Triangle - Bipolar
      if (phase < 0.25) return phase * 4;
      if (phase < 0.75) return 1 - (phase - 0.25) * 4;
      return -1 + (phase - 0.75) * 4;

    case 'SIN': // Sine - Bipolar
      return Math.sin(phase * 2 * Math.PI);

    case 'SQR': // Square - Bipolar
      return phase < 0.5 ? 1 : -1;

    case 'SAW': // Sawtooth - Bipolar (falling)
      return 1 - phase * 2;

    case 'EXP': // Exponential - Unipolar (1 to 0)
      return sampleExpDecay(phase);

    case 'RMP': // Ramp - Unipolar (0 to 1)
      return phase;

    case 'RND': {
      // Random - 16 steps per cycle
      const steps = 16;
      const step = Math.floor(phase * steps) % steps;
      return seededRandom(step, randomSeed);
    }

    default:
      return 0;
  }
}

/**
 * Sample RND waveform with SLEW (smoothing) applied
 *
 * Copied from elektron-lfo/core/waveforms.ts (sampleRandomWithSlew)
 *
 * @param phase - Current phase (0-1)
 * @param slew - Slew amount (0-127). 0 = no smoothing, 127 = max smoothing
 * @param randomSeed - Seed for random values (changes each cycle)
 */
export function sampleRandomWithSlew(
  phase: number,
  slew: number,
  randomSeed: number = 0
): number {
  'worklet';
  const steps = 16;
  const step = Math.floor(phase * steps) % steps;
  const prevStep = (step - 1 + steps) % steps;
  const stepProgress = (phase * steps) % 1;

  const currentValue = seededRandom(step, randomSeed);
  const prevValue = seededRandom(prevStep, randomSeed);

  // slew: 0 = sharp S&H, 127 = maximum smoothing
  const slewAmount = slew / 127;
  if (slewAmount <= 0) {
    return currentValue;
  }

  // Smoothstep interpolation
  const t = stepProgress;
  const smoothT = t * t * (3 - 2 * t);
  const interpT = smoothT * slewAmount;

  return prevValue + (currentValue - prevValue) * interpT;
}

/**
 * Check if a waveform is unipolar (0 to +1) vs bipolar (-1 to +1)
 *
 * Copied from elektron-lfo/core/waveforms.ts (isUnipolar)
 */
export function isUnipolarWorklet(waveform: WaveformType): boolean {
  'worklet';
  return waveform === 'EXP' || waveform === 'RMP';
}

/**
 * Sample waveform with optional slew for RND
 * This is the main entry point that handles slew when applicable
 *
 * @param waveform - Waveform type
 * @param phase - Current phase (0-1)
 * @param slew - Slew amount for RND (0-127)
 * @param randomSeed - Seed for RND waveform (changes each cycle)
 */
export function sampleWaveformWithSlew(
  waveform: WaveformType,
  phase: number,
  slew: number = 0,
  randomSeed: number = 0
): number {
  'worklet';
  if (waveform === 'RND' && slew > 0) {
    return sampleRandomWithSlew(phase, slew, randomSeed);
  }
  return sampleWaveformWorklet(waveform, phase, randomSeed);
}
