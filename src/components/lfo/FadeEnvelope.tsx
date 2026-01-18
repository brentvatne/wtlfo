import React, { useMemo } from 'react';
import { Path, Skia } from '@shopify/react-native-skia';
import type { WaveformType } from './types';
import { sampleWaveform } from './hooks/useWaveformPath';

interface FadeEnvelopeProps {
  waveform: WaveformType;
  width: number;
  height: number;
  color: string;
  resolution?: number;
  depth?: number;
  fade?: number;
  strokeWidth?: number;
  /** Start phase offset (0-127) to shift waveform display */
  startPhase?: number;
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
  fade,
  strokeWidth = 2,
  startPhase,
}: FadeEnvelopeProps) {
  const padding = 8;
  const depthScale = depth !== undefined ? depth / 63 : 1;
  const startPhaseNormalized = (startPhase || 0) / 128;

  // Create the path for the trajectory with fade applied
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    const centerY = height / 2;
    const scaleY = -drawHeight / 2;

    for (let i = 0; i <= resolution; i++) {
      const xNormalized = i / resolution;
      // Shift phase for waveform sampling (same as WaveformDisplay)
      const waveformPhase = (xNormalized + startPhaseNormalized) % 1;
      let value = sampleWaveform(waveform, waveformPhase);

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
  }, [waveform, width, height, resolution, depthScale, fade, startPhaseNormalized]);

  return (
    <Path
      path={path}
      color={color}
      style="stroke"
      strokeWidth={strokeWidth}
      strokeCap="round"
      strokeJoin="round"
    />
  );
}
