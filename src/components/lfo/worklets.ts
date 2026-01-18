import type { WaveformType } from './types';

/**
 * Worklet-compatible waveform sampling function
 * Can be called from within Reanimated worklets (useDerivedValue, useAnimatedStyle, etc.)
 */
export function sampleWaveformWorklet(waveform: WaveformType, phase: number): number {
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

    case 'SAW': // Sawtooth - Bipolar (rising)
      return phase * 2 - 1;

    case 'EXP': {
      // Exponential - Unipolar (0 to 1)
      const k = 4;
      return (Math.exp(phase * k) - 1) / (Math.exp(k) - 1);
    }

    case 'RMP': // Ramp - Unipolar (1 to 0, falling)
      return 1 - phase;

    case 'RND': {
      // Random - show as noise pattern for static display
      // For static display, show a representative S&H pattern
      const steps = 8;
      const step = Math.floor(phase * steps);
      // Use deterministic "random" for consistent display
      return Math.sin(step * 12.9898) * 0.8;
    }

    default:
      return 0;
  }
}

/**
 * Worklet-compatible check for unipolar waveforms
 */
export function isUnipolarWorklet(waveform: WaveformType): boolean {
  'worklet';
  return waveform === 'EXP' || waveform === 'RMP';
}
