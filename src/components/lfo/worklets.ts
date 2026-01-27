import type { WaveformType } from './types';

/**
 * Get the raw random S&H value for a given step
 * Uses a seed to generate different patterns each cycle
 * @param step - Step number (0-15)
 * @param seed - Seed value that changes each cycle (default 0 for backwards compatibility)
 */
export function getRandomStepValue(step: number, seed: number = 0): number {
  'worklet';
  // Combine step and seed to get varying patterns each cycle
  // The magic numbers produce a good distribution of positive/negative values
  const combinedSeed = step * 78.233 + seed * 17.31 + 0.5;
  return Math.sin(combinedSeed) * 0.9;
}

/**
 * Worklet-compatible waveform sampling function
 * Can be called from within Reanimated worklets (useDerivedValue, useAnimatedStyle, etc.)
 * @param waveform - Waveform type
 * @param phase - Current phase (0-1)
 * @param randomSeed - Seed for RND waveform (changes each cycle)
 */
export function sampleWaveformWorklet(waveform: WaveformType, phase: number, randomSeed: number = 0): number {
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

    case 'EXP': {
      // Exponential - Unipolar (0 to 1)
      const k = 4;
      return (Math.exp(phase * k) - 1) / (Math.exp(k) - 1);
    }

    case 'RMP': // Ramp - Unipolar (0 to 1, rising)
      return phase;

    case 'RND': {
      // Random - show as sample-and-hold pattern
      // Uses 16 steps per cycle to match the actual LFO engine
      // randomSeed changes each cycle to produce different patterns
      const steps = 16;
      const step = Math.floor(phase * steps);
      return getRandomStepValue(step, randomSeed);
    }

    default:
      return 0;
  }
}

/**
 * Sample RND waveform with SLEW (smoothing) applied
 *
 * @param phase - Current phase (0-1)
 * @param slew - Slew amount (0-127). 0 = no smoothing, 127 = max smoothing
 * @param randomSeed - Seed for random values (changes each cycle)
 * @returns Smoothed random value
 */
export function sampleRandomWithSlew(phase: number, slew: number, randomSeed: number = 0): number {
  'worklet';
  const steps = 16;
  const currentStep = Math.floor(phase * steps);
  const stepPhase = (phase * steps) % 1; // Phase within current step (0-1)

  // Get current and previous step values
  const currentValue = getRandomStepValue(currentStep, randomSeed);
  const prevStep = (currentStep - 1 + steps) % steps;
  const prevValue = getRandomStepValue(prevStep, randomSeed);

  // No slew = instant transition (classic S&H)
  if (slew === 0) {
    return currentValue;
  }

  // Calculate slew amount (0-127 maps to 0-1 transition time as fraction of step)
  // At slew=127, we interpolate over the entire step duration
  const slewFraction = slew / 127;

  if (stepPhase < slewFraction) {
    // During transition: interpolate from previous value to current
    const t = stepPhase / slewFraction;
    // Use smoothstep for more natural-feeling transitions
    const smoothT = t * t * (3 - 2 * t);
    return prevValue + (currentValue - prevValue) * smoothT;
  }

  // Past transition: hold at current value
  return currentValue;
}

/**
 * Worklet-compatible check for unipolar waveforms
 */
export function isUnipolarWorklet(waveform: WaveformType): boolean {
  'worklet';
  return waveform === 'EXP' || waveform === 'RMP';
}

/**
 * Sample waveform with optional slew for RND
 * This is the main entry point that handles slew when applicable
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
