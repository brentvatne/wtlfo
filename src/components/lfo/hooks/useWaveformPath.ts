import { useMemo } from 'react';
import { Skia, SkPath } from '@shopify/react-native-skia';
import type { WaveformType } from '../types';

/**
 * Generates waveform sample based on Digitakt II specifications
 */
function sampleWaveform(waveform: WaveformType, phase: number): number {
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

    case 'EXP': // Exponential - Unipolar (0 to 1)
      const k = 4;
      return (Math.exp(phase * k) - 1) / (Math.exp(k) - 1);

    case 'RMP': // Ramp - Unipolar (1 to 0, falling)
      return 1 - phase;

    case 'RND': // Random - show as noise pattern for static display
      // For static display, show a representative S&H pattern
      const steps = 8;
      const step = Math.floor(phase * steps);
      // Use deterministic "random" for consistent display
      return Math.sin(step * 12.9898) * 0.8;

    default:
      return 0;
  }
}

/**
 * Determines if waveform is unipolar (0 to 1) vs bipolar (-1 to 1)
 */
export function isUnipolar(waveform: WaveformType): boolean {
  return waveform === 'EXP' || waveform === 'RMP';
}

/**
 * Hook to generate a Skia Path for the waveform
 */
export function useWaveformPath(
  waveform: WaveformType,
  width: number,
  height: number,
  resolution: number = 128,
  padding: number = 8
): SkPath {
  return useMemo(() => {
    const path = Skia.Path.Make();
    const unipolar = isUnipolar(waveform);

    // Calculate drawable area
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    // Center Y for bipolar, bottom for unipolar
    const centerY = unipolar
      ? height - padding  // Unipolar: 0 at bottom
      : height / 2;       // Bipolar: 0 at center

    // Scale factor for Y
    const scaleY = unipolar
      ? -drawHeight        // Unipolar: full height upward
      : -drawHeight / 2;   // Bipolar: half height each direction

    for (let i = 0; i <= resolution; i++) {
      const phase = i / resolution;
      const value = sampleWaveform(waveform, phase);

      const x = padding + phase * drawWidth;
      const y = centerY + value * scaleY;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    return path;
  }, [waveform, width, height, resolution, padding]);
}

export { sampleWaveform };
