import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import type { WaveformType } from './types';

// Import the waveform sampling function from the centralized worklets module
import { sampleWaveformWorklet } from './worklets';

export interface WaveformIconProps {
  /** Waveform type to display */
  waveform: WaveformType;
  /** Icon size in pixels (width and height) */
  size?: number;
  /** Stroke color */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Optional background color */
  backgroundColor?: string;
  /** Border radius for the container */
  borderRadius?: number;
}

// Waveform labels for accessibility
const WAVEFORM_LABELS: Record<WaveformType, string> = {
  TRI: 'Triangle wave',
  SIN: 'Sine wave',
  SQR: 'Square wave',
  SAW: 'Sawtooth wave',
  EXP: 'Exponential wave',
  RMP: 'Ramp wave',
  RND: 'Random/Sample & Hold',
};

// Path cache for performance (waveforms are deterministic)
const pathCache = new Map<string, ReturnType<typeof Skia.Path.Make>>();

function getCachedPath(
  waveform: WaveformType,
  size: number,
  strokeWidth: number
): ReturnType<typeof Skia.Path.Make> {
  const key = `${waveform}-${size}-${strokeWidth}`;

  if (!pathCache.has(key)) {
    const path = Skia.Path.Make();

    // Dynamic resolution based on size (more points for larger icons)
    const resolution = Math.max(16, Math.min(64, Math.round(size * 1.5)));
    const padding = Math.max(2, strokeWidth);

    const drawWidth = size - padding * 2;
    const drawHeight = size - padding * 2;
    const centerY = size / 2;
    const scaleY = -drawHeight / 2.5; // Slightly smaller to fit nicely

    for (let i = 0; i <= resolution; i++) {
      const phase = i / resolution;
      const value = sampleWaveformWorklet(waveform, phase);

      const x = padding + (i / resolution) * drawWidth;
      const y = centerY + value * scaleY;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    pathCache.set(key, path);
  }

  return pathCache.get(key)!;
}

/**
 * Small inline waveform icon component (sparkline-style)
 *
 * Uses Skia for GPU-accelerated vector rendering at small sizes.
 * Reuses the sampleWaveform function from the main visualizer for consistency.
 *
 * @example
 * // Basic usage
 * <WaveformIcon waveform="SIN" size={20} color="#ff6600" />
 *
 * // With background
 * <WaveformIcon
 *   waveform="TRI"
 *   size={24}
 *   color="#ffffff"
 *   backgroundColor="#2a2a2a"
 *   borderRadius={4}
 * />
 *
 * // Inline with text
 * <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
 *   <WaveformIcon waveform="SIN" size={16} color="#ff6600" />
 *   <Text>Sine produces smooth modulation</Text>
 * </View>
 */
export function WaveformIcon({
  waveform,
  size = 20,
  color = '#ff6600',
  strokeWidth = 1.5,
  backgroundColor,
  borderRadius = 0,
}: WaveformIconProps) {
  // Get cached path
  const path = useMemo(
    () => getCachedPath(waveform, size, strokeWidth),
    [waveform, size, strokeWidth]
  );

  // Fallback for web if Skia isn't ready (rare edge case)
  if (Platform.OS === 'web' && typeof Skia === 'undefined') {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            backgroundColor: backgroundColor || 'transparent',
            borderRadius,
          },
        ]}
        accessibilityLabel={WAVEFORM_LABELS[waveform]}
        accessibilityRole="image"
      >
        <Text style={[styles.fallbackText, { color, fontSize: size * 0.5 }]}>
          {waveform}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor: backgroundColor || 'transparent',
          borderRadius,
        },
      ]}
      accessibilityLabel={WAVEFORM_LABELS[waveform]}
      accessibilityRole="image"
    >
      <Canvas style={{ width: size, height: size }}>
        <Path
          path={path}
          color={color}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
          strokeJoin="round"
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
