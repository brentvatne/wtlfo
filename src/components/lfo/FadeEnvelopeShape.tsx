import React, { useMemo } from 'react';
import { Path, Skia, DashPathEffect } from '@shopify/react-native-skia';

interface FadeEnvelopeShapeProps {
  width: number;
  height: number;
  color: string;
  /** Fade value (-64 to +63) */
  fade: number;
  /** Depth value (-64 to +63) to scale the envelope height */
  depth?: number;
  strokeWidth?: number;
  /** Opacity for the envelope (default 0.4) */
  opacity?: number;
}

/**
 * FadeEnvelopeShape draws just the fade envelope curve itself,
 * independent of the LFO waveform. This shows how the fade multiplier
 * changes over the cycle.
 *
 * For fade-in (negative fade): envelope goes 0 → 1 over fadeDuration
 * For fade-out (positive fade): envelope goes 1 → 0 over fadeDuration
 *
 * The envelope is drawn as a dashed line at lower opacity to distinguish
 * it from the main fade trajectory curve (which shows waveform × fade).
 */
export function FadeEnvelopeShape({
  width,
  height,
  color,
  fade,
  depth,
  strokeWidth = 2,
  opacity = 0.4,
}: FadeEnvelopeShapeProps) {
  const padding = 8;
  // Clamp to [-1, 1] to handle asymmetric range (-64 to +63)
  const depthScale = depth !== undefined ? Math.max(-1, Math.min(1, depth / 63)) : 1;
  // Use absolute depth for envelope height (envelope shows amplitude, always positive direction from center)
  const absDepthScale = Math.abs(depthScale);

  // Create the path for the fade envelope shape
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    const centerY = height / 2;
    // Scale envelope to show at depth level (positive direction from center)
    const scaleY = -drawHeight / 2 * absDepthScale;

    const resolution = 128;
    const absFade = Math.abs(fade);
    // Fade completes when phase reaches (64 - absFade) / 64
    const fadeDuration = (64 - absFade) / 64;

    for (let i = 0; i <= resolution; i++) {
      const xNormalized = i / resolution;

      let fadeEnvelope: number;
      if (fade < 0) {
        // Fade-in: envelope goes from 0 to 1 over fadeDuration
        fadeEnvelope = fadeDuration > 0 ? Math.min(1, xNormalized / fadeDuration) : 1;
      } else {
        // Fade-out: envelope goes from 1 to 0 over fadeDuration
        fadeEnvelope = fadeDuration > 0 ? Math.max(0, 1 - xNormalized / fadeDuration) : 0;
      }

      const x = padding + xNormalized * drawWidth;
      // Draw envelope in the positive direction (above center for positive depth)
      const y = centerY + fadeEnvelope * scaleY;

      if (i === 0) {
        p.moveTo(x, y);
      } else {
        p.lineTo(x, y);
      }
    }

    return p;
  }, [width, height, fade, absDepthScale]);

  return (
    <Path
      path={path}
      color={color}
      style="stroke"
      strokeWidth={strokeWidth}
      strokeCap="round"
      strokeJoin="round"
      opacity={opacity}
    >
      <DashPathEffect intervals={[6, 4]} phase={0} />
    </Path>
  );
}
