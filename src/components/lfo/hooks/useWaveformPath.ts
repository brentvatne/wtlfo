import { useMemo } from 'react';
import { Skia, SkPath } from '@shopify/react-native-skia';
import type { WaveformType } from '../types';
import { sampleWaveformWorklet, sampleWaveformWithSlew, isUnipolarWorklet } from '../worklets';

/**
 * Re-export sampleWaveformWorklet as sampleWaveform for backward compatibility.
 * The worklet version can be safely called from non-worklet contexts.
 */
export const sampleWaveform = sampleWaveformWorklet;

/**
 * Determines if waveform is unipolar (0 to 1) vs bipolar (-1 to 1)
 * Re-exported from worklets for backward compatibility.
 */
export const isUnipolar = isUnipolarWorklet;

/**
 * Hook to generate a Skia Path for the waveform
 *
 * Uses bipolar coordinate system (-1 to 1, centered).
 * Applies depth scaling to show the actual output shape.
 *
 * @param depth - Optional depth value (-64 to +63). Scales and potentially inverts the waveform.
 * @param speed - Optional speed value. Negative speed inverts the output (separate from depth).
 * @param startPhase - Optional start phase offset (0-127). Shifts the waveform so this phase appears at x=0.
 * @param closePath - If true, closes the path to the baseline for proper fill rendering.
 */
export function useWaveformPath(
  waveform: WaveformType,
  width: number,
  height: number,
  resolution: number = 128,
  padding: number = 8,
  depth?: number,
  speed?: number,
  startPhase?: number,
  closePath: boolean = false
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
    // Clamp to [-1, 1] to handle asymmetric range (-64 to +63)
    const depthScale = depth !== undefined ? Math.max(-1, Math.min(1, depth / 63)) : 1;

    // Negative speed inverts the output (separate from depth inversion)
    const speedInvert = speed !== undefined && speed < 0 ? -1 : 1;

    // For RND waveform, startPhase acts as SLEW (0=sharp S&H, 127=max smoothing)
    // For other waveforms, it's a phase offset (0-127 → 0.0-~1.0)
    const isRandom = waveform === 'RND';
    const slewValue = isRandom ? (startPhase || 0) : 0;
    const startPhaseNormalized = isRandom ? 0 : (startPhase || 0) / 128;

    const startX = padding;
    const endX = padding + drawWidth;

    let prevValue: number | null = null;

    for (let i = 0; i <= resolution; i++) {
      const xNormalized = i / resolution;
      // Shift phase so startPhaseNormalized appears at x=0 (not used for RND)
      const phase = (xNormalized + startPhaseNormalized) % 1;
      let value = isRandom
        ? sampleWaveformWithSlew(waveform, phase, slewValue)
        : sampleWaveformWorklet(waveform, phase);

      // Apply speed inversion (negative speed inverts raw output)
      value = value * speedInvert;

      // Apply depth scaling
      value = value * depthScale;

      const x = padding + xNormalized * drawWidth;
      const y = centerY + value * scaleY;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        // For discontinuous waveforms (SQR, RND), draw vertical transitions
        // if the value changed significantly between samples
        const threshold = 0.5; // Large value change indicates a step
        if (prevValue !== null && Math.abs(value - prevValue) > threshold) {
          // Draw vertical line at the current x position from previous y to new y
          const prevY = centerY + prevValue * scaleY;
          path.lineTo(x, prevY); // Horizontal to current x at old value
          path.lineTo(x, y); // Vertical jump to new value
        } else {
          path.lineTo(x, y);
        }
      }

      prevValue = value;
    }

    // Close path to baseline for fill rendering
    if (closePath) {
      path.lineTo(endX, centerY);
      path.lineTo(startX, centerY);
      path.close();
    }

    return path;
  }, [waveform, width, height, resolution, padding, depth, speed, startPhase, closePath]);
}

