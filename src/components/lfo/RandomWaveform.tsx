import React, { useMemo } from 'react';
import { Path, Skia } from '@shopify/react-native-skia';

interface RandomWaveformProps {
  samples: Array<{ phase: number; value: number }>;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  depth?: number;
  /** Start phase offset (0-127) to shift display position */
  startPhase?: number;
}

/**
 * RandomWaveform renders the actual random samples as a stepped line.
 * This shows the real sample-and-hold values from the LFO engine.
 */
export function RandomWaveform({
  samples,
  width,
  height,
  strokeColor,
  strokeWidth,
  fillColor,
  depth,
  startPhase,
}: RandomWaveformProps) {
  const padding = 8;
  const depthScale = depth !== undefined ? depth / 63 : 1;
  const startPhaseNormalized = (startPhase || 0) / 128;

  const { strokePath, fillPath } = useMemo(() => {
    const stroke = Skia.Path.Make();
    const fill = Skia.Path.Make();

    if (samples.length === 0) {
      return { strokePath: stroke, fillPath: fill };
    }

    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    const centerY = height / 2;
    const scaleY = -drawHeight / 2;
    const startX = padding;
    const endX = padding + drawWidth;

    // Shift samples so startPhaseNormalized appears at x=0
    // displayPhase = (sample.phase - startPhaseNormalized + 1) % 1
    const shiftedSamples = samples.map(s => ({
      ...s,
      displayPhase: ((s.phase - startPhaseNormalized) % 1 + 1) % 1,
    }));

    // Sort by display phase for correct drawing order
    shiftedSamples.sort((a, b) => a.displayPhase - b.displayPhase);

    // Draw stepped line through samples
    for (let i = 0; i < shiftedSamples.length; i++) {
      const sample = shiftedSamples[i];
      const x = padding + sample.displayPhase * drawWidth;
      const scaledValue = sample.value * depthScale;
      const y = centerY + scaledValue * scaleY;

      if (i === 0) {
        // Start from left edge at the first sample's value
        stroke.moveTo(padding, y);
        stroke.lineTo(x, y);
        fill.moveTo(padding, y);
        fill.lineTo(x, y);
      } else {
        // Horizontal line to this sample's x position at previous y
        const prevY = centerY + shiftedSamples[i - 1].value * depthScale * scaleY;
        stroke.lineTo(x, prevY);
        stroke.lineTo(x, y);
        fill.lineTo(x, prevY);
        fill.lineTo(x, y);
      }
    }

    // Extend to right edge if we have samples
    if (shiftedSamples.length > 0) {
      const lastSample = shiftedSamples[shiftedSamples.length - 1];
      const lastY = centerY + lastSample.value * depthScale * scaleY;
      stroke.lineTo(endX, lastY);
      fill.lineTo(endX, lastY);

      // Close fill path to baseline
      fill.lineTo(endX, centerY);
      fill.lineTo(startX, centerY);
      fill.close();
    }

    return { strokePath: stroke, fillPath: fill };
  }, [samples, width, height, depthScale, startPhaseNormalized]);

  if (samples.length === 0) {
    return null;
  }

  return (
    <>
      {fillColor && (
        <Path path={fillPath} color={fillColor} style="fill" opacity={0.2} />
      )}
      <Path
        path={strokePath}
        color={strokeColor}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
      />
    </>
  );
}
