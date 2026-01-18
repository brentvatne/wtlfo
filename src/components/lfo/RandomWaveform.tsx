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
}: RandomWaveformProps) {
  const padding = 8;
  const depthScale = depth !== undefined ? depth / 63 : 1;

  const path = useMemo(() => {
    const p = Skia.Path.Make();

    if (samples.length === 0) {
      return p;
    }

    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    const centerY = height / 2;
    const scaleY = -drawHeight / 2;

    // Sort samples by phase
    const sortedSamples = [...samples].sort((a, b) => a.phase - b.phase);

    // Draw stepped line through samples
    for (let i = 0; i < sortedSamples.length; i++) {
      const sample = sortedSamples[i];
      const x = padding + sample.phase * drawWidth;
      const scaledValue = sample.value * depthScale;
      const y = centerY + scaledValue * scaleY;

      if (i === 0) {
        // Start from left edge at the first sample's value
        p.moveTo(padding, y);
        p.lineTo(x, y);
      } else {
        // Horizontal line to this sample's x position at previous y
        const prevY = centerY + sortedSamples[i - 1].value * depthScale * scaleY;
        p.lineTo(x, prevY);
        // Vertical line to this sample's y
        p.lineTo(x, y);
      }
    }

    // Extend to right edge if we have samples
    if (sortedSamples.length > 0) {
      const lastSample = sortedSamples[sortedSamples.length - 1];
      const lastY = centerY + lastSample.value * depthScale * scaleY;
      p.lineTo(padding + drawWidth, lastY);
    }

    return p;
  }, [samples, width, height, depthScale]);

  if (samples.length === 0) {
    return null;
  }

  return (
    <>
      {fillColor && (
        <Path path={path} color={fillColor} style="fill" opacity={0.2} />
      )}
      <Path
        path={path}
        color={strokeColor}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
      />
    </>
  );
}
