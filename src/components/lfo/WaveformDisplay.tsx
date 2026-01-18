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
}: WaveformDisplayProps) {
  const path = useWaveformPath(waveform, width, height, resolution, 8, depth);

  return (
    <>
      {/* Optional fill */}
      {fillColor && (
        <Path path={path} color={fillColor} style="fill" opacity={0.2} />
      )}

      {/* Stroke */}
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
