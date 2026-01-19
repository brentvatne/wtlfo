import React from 'react';
import { Path } from '@shopify/react-native-skia';
import { useWaveformPath } from './hooks/useWaveformPath';
import type { WaveformDisplayProps } from './types';

export function WaveformDisplay({
  waveform,
  width,
  height,
  strokeColor,
  strokeWidth,
  fillColor,
  resolution = 128,
  depth,
  startPhase,
}: WaveformDisplayProps) {
  // Stroke path (open)
  const strokePath = useWaveformPath(waveform, width, height, resolution, 8, depth, startPhase, false);
  // Fill path (closed to baseline)
  const fillPath = useWaveformPath(waveform, width, height, resolution, 8, depth, startPhase, true);

  return (
    <>
      {/* Optional fill - closed path to baseline */}
      {fillColor && (
        <Path path={fillPath} color={fillColor} style="fill" opacity={0.2} />
      )}

      {/* Stroke - open path */}
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
