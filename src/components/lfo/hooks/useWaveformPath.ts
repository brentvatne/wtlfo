import { useMemo } from 'react';
import { Skia, SkPath } from '@shopify/react-native-skia';
import type { WaveformType } from '../types';

/**
 * Generates waveform sample based on Digitakt II specifications
 */
function sampleWaveform(waveform: WaveformType, phase: number): number {
  switch (waveform) {
    case 'TRI': // Triangle - Bipolar (0 → +1 → -1 → 0)
      if (phase < 0.25) return phase * 4;           // 0 to +1
      if (phase < 0.75) return 1 - (phase - 0.25) * 4; // +1 to -1
      return -1 + (phase - 0.75) * 4;               // -1 to 0

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
 *
 * Uses bipolar coordinate system (-1 to 1, centered).
 * Applies depth scaling to show the actual output shape.
 *
 * @param depth - Optional depth value (-64 to +63). Scales and potentially inverts the waveform.
 */
export function useWaveformPath(
  waveform: WaveformType,
  width: number,
  height: number,
  resolution: number = 128,
  padding: number = 8,
  depth?: number
): SkPath {
  return useMemo(() => {
    const path = Skia.Path.Make();

    // Calculate drawable area
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    // Always use centered (bipolar) coordinate system
    const centerY = height / 2;
    const scaleY = -drawHeight / 2;

    // Depth scaling (depth/63 gives -1 to 1 range)
    const depthScale = depth !== undefined ? depth / 63 : 1;

    for (let i = 0; i <= resolution; i++) {
      const phase = i / resolution;
      let value = sampleWaveform(waveform, phase);

      // Apply depth scaling
      value = value * depthScale;

      const x = padding + phase * drawWidth;
      const y = centerY + value * scaleY;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    return path;
  }, [waveform, width, height, resolution, padding, depth]);
}

export { sampleWaveform };
