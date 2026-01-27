import React, { useMemo } from 'react';
import { Path, Skia } from '@shopify/react-native-skia';
import type { WaveformType } from './types';
import { sampleWaveformWorklet, isUnipolarWorklet, sampleExpDecay, sampleExpRise } from './worklets';

interface FadeEnvelopeProps {
  waveform: WaveformType;
  width: number;
  height: number;
  color: string;
  resolution?: number;
  depth?: number;
  /** Speed value. Negative speed inverts the output (separate from depth inversion). */
  speed?: number;
  fade?: number;
  strokeWidth?: number;
  /** Start phase offset (0-127) to shift waveform display */
  startPhase?: number;
  /** Opacity of the curve (0-1) */
  opacity?: number;
}

/**
 * FadeEnvelope draws the trajectory curve showing the path the dot
 * will follow with both waveform and fade envelope applied.
 *
 * For fade-in (negative fade): envelope goes 0 → 1 over the cycle
 * For fade-out (positive fade): envelope goes 1 → 0 over the cycle
 */
export function FadeEnvelope({
  waveform,
  width,
  height,
  color,
  resolution = 128,
  depth,
  speed,
  fade,
  strokeWidth = 2,
  startPhase,
  opacity = 1,
}: FadeEnvelopeProps) {
  const padding = 8;
  // Account for stroke extending beyond path centerline
  const strokePadding = strokeWidth / 2;
  const effectivePadding = padding + strokePadding;
  // Clamp to [-1, 1] to handle asymmetric range (-64 to +63)
  const depthScale = depth !== undefined ? Math.max(-1, Math.min(1, depth / 63)) : 1;
  const hasNegativeSpeed = speed !== undefined && speed < 0;
  const isUnipolar = isUnipolarWorklet(waveform);
  const isExp = waveform === 'EXP';
  const startPhaseNormalized = (startPhase || 0) / 128;

  // Create the path for the trajectory with fade applied
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const drawWidth = width - padding * 2;
    // Use effective padding for vertical bounds to prevent clipping
    const drawHeight = height - effectivePadding * 2;
    const centerY = height / 2;
    const scaleY = -drawHeight / 2;

    for (let i = 0; i <= resolution; i++) {
      const xNormalized = i / resolution;
      // Shift phase for waveform sampling (same as WaveformDisplay)
      const waveformPhase = (xNormalized + startPhaseNormalized) % 1;

      let value: number;
      if (isExp) {
        // EXP needs different formulas to maintain concave shape in both directions
        value = hasNegativeSpeed ? sampleExpRise(waveformPhase) : sampleExpDecay(waveformPhase);
      } else {
        value = sampleWaveformWorklet(waveform, waveformPhase);
      }

      // Apply speed transformation (except EXP which already handled it)
      if (hasNegativeSpeed && !isExp) {
        if (isUnipolar) {
          // RMP: flip values (1-x works for linear)
          value = 1 - value;
        } else {
          // Bipolar: invert polarity
          value = -value;
        }
      }

      // Apply depth scaling
      value = value * depthScale;

      // Apply fade envelope
      // Fade duration is proportional to |fade| / 64
      // fade = -64 means instant (no fade), fade = -1 means slow fade over full cycle
      // fade = -32 means fade completes at phase 0.5
      // Note: Fade uses visual position (xNormalized), not waveform phase
      if (fade !== undefined && fade !== 0) {
        const absFade = Math.abs(fade);
        // Fade completes when phase reaches (64 - absFade) / 64
        // For fade = -32: completes at phase 0.5
        // For fade = -64: completes at phase 0 (instant)
        // For fade = -1: completes at phase ~0.98
        const fadeDuration = (64 - absFade) / 64;

        let fadeEnvelope: number;
        if (fade < 0) {
          // Fade-in: envelope goes from 0 to 1 over fadeDuration
          fadeEnvelope = fadeDuration > 0 ? Math.min(1, xNormalized / fadeDuration) : 1;
        } else {
          // Fade-out: envelope goes from 1 to 0 over fadeDuration
          fadeEnvelope = fadeDuration > 0 ? Math.max(0, 1 - xNormalized / fadeDuration) : 0;
        }
        value = value * fadeEnvelope;
      }

      const x = padding + xNormalized * drawWidth;
      const y = centerY + value * scaleY;

      if (i === 0) {
        p.moveTo(x, y);
      } else {
        p.lineTo(x, y);
      }
    }

    return p;
  }, [waveform, width, height, resolution, depthScale, hasNegativeSpeed, isUnipolar, isExp, fade, startPhaseNormalized, effectivePadding]);

  return (
    <Path
      path={path}
      color={color}
      style="stroke"
      strokeWidth={strokeWidth}
      strokeCap="round"
      strokeJoin="round"
      opacity={opacity}
    />
  );
}
