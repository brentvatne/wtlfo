import React from 'react';
import { Group, Line } from '@shopify/react-native-skia';
import type { GridLinesProps } from './types';

export function GridLines({
  width,
  height,
  color,
  verticalDivisions = 8,
  horizontalDivisions = 4,
}: GridLinesProps) {
  const padding = 8;

  const verticalLines = [];
  const horizontalLines = [];

  // Vertical grid lines
  for (let i = 0; i <= verticalDivisions; i++) {
    const x = padding + (i / verticalDivisions) * (width - padding * 2);
    verticalLines.push(
      <Line
        key={`v-${i}`}
        p1={{ x, y: padding }}
        p2={{ x, y: height - padding }}
        color={color}
        style="stroke"
        strokeWidth={1}
      />
    );
  }

  // Horizontal grid lines
  for (let i = 0; i <= horizontalDivisions; i++) {
    const y = padding + (i / horizontalDivisions) * (height - padding * 2);
    horizontalLines.push(
      <Line
        key={`h-${i}`}
        p1={{ x: padding, y }}
        p2={{ x: width - padding, y }}
        color={color}
        style="stroke"
        strokeWidth={1}
      />
    );
  }

  // Center line (zero crossing) - slightly brighter
  const centerY = height / 2;

  return (
    <Group>
      <Group opacity={0.25}>
        {verticalLines}
        {horizontalLines}
      </Group>
      {/* Emphasized zero line - more visible than other grid lines */}
      <Line
        p1={{ x: padding, y: centerY }}
        p2={{ x: width - padding, y: centerY }}
        color="#ffffff"
        style="stroke"
        strokeWidth={1}
        opacity={0.35}
      />
    </Group>
  );
}
