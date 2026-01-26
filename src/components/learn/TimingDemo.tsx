import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Circle,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  useDerivedValue,
  Easing,
} from 'react-native-reanimated';

interface TimingDemoProps {
  width: number;
  height?: number;
}

const WAVE_COLOR_FAST = '#ff6600';
const WAVE_COLOR_SLOW = '#4488ff';
const GRID_COLOR = '#333344';

export function TimingDemo({ width, height = 160 }: TimingDemoProps) {

  // Fast wave: SPD=16, MULT=64 (product 1024, 1/16 note)
  const phaseFast = useSharedValue(0);
  // Slow wave: SPD=16, MULT=8 (product 128, 1 bar)
  const phaseSlow = useSharedValue(0);

  useEffect(() => {
    phaseFast.value = 0;
    phaseSlow.value = 0;

    // Fast wave completes 8x faster than slow wave
    phaseFast.value = withRepeat(
      withTiming(1, { duration: 500, easing: Easing.linear }),
      -1,
      false
    );
    phaseSlow.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
  }, [phaseFast, phaseSlow]);

  const padding = 16;
  const labelHeight = 26;
  const canvasHeight = height - labelHeight * 2;
  const waveHeight = (canvasHeight - padding * 2 - 10) / 2;
  const waveWidth = width - padding * 2;

  const wavePathTop = React.useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 60;
    const amp = waveHeight * 0.35;
    const centerY = padding + waveHeight / 2;

    for (let i = 0; i <= steps; i++) {
      const x = padding + (i / steps) * waveWidth;
      const y = centerY - Math.sin((i / steps) * Math.PI * 2) * amp;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    return path;
  }, [waveHeight, waveWidth, padding]);

  const wavePathBottom = React.useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 60;
    const amp = waveHeight * 0.35;
    const yOffset = padding + waveHeight + 10;
    const centerY = yOffset + waveHeight / 2;

    for (let i = 0; i <= steps; i++) {
      const x = padding + (i / steps) * waveWidth;
      const y = centerY - Math.sin((i / steps) * Math.PI * 2) * amp;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    return path;
  }, [waveHeight, waveWidth, padding]);

  // Grid center lines
  const gridPath = React.useMemo(() => {
    const path = Skia.Path.Make();
    const centerYTop = padding + waveHeight / 2;
    const centerYBottom = padding + waveHeight + 10 + waveHeight / 2;

    path.moveTo(padding, centerYTop);
    path.lineTo(padding + waveWidth, centerYTop);
    path.moveTo(padding, centerYBottom);
    path.lineTo(padding + waveWidth, centerYBottom);
    return path;
  }, [waveHeight, waveWidth, padding]);

  // Fast indicator
  const fastX = useDerivedValue(() => {
    return padding + phaseFast.value * waveWidth;
  }, [phaseFast, waveWidth, padding]);

  const fastY = useDerivedValue(() => {
    const centerY = padding + waveHeight / 2;
    const amp = waveHeight * 0.35;
    return centerY - Math.sin(phaseFast.value * Math.PI * 2) * amp;
  }, [phaseFast, waveHeight, padding]);

  // Slow indicator
  const slowX = useDerivedValue(() => {
    return padding + phaseSlow.value * waveWidth;
  }, [phaseSlow, waveWidth, padding]);

  const slowY = useDerivedValue(() => {
    const centerY = padding + waveHeight + 10 + waveHeight / 2;
    const amp = waveHeight * 0.35;
    return centerY - Math.sin(phaseSlow.value * Math.PI * 2) * amp;
  }, [phaseSlow, waveHeight, padding]);

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.labelRow}>
        <View style={[styles.labelDot, { backgroundColor: WAVE_COLOR_FAST }]} />
        <Text style={[styles.labelText, { color: WAVE_COLOR_FAST }]}>
          SPD=16 × MULT=64 (1/16 note)
        </Text>
      </View>
      <Canvas style={{ width, height: canvasHeight }}>
        {/* Grid lines */}
        <Path
          path={gridPath}
          color={GRID_COLOR}
          style="stroke"
          strokeWidth={1}
        />

        {/* Fast wave (top) */}
        <Path
          path={wavePathTop}
          color={WAVE_COLOR_FAST}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
        />
        <Circle cx={fastX} cy={fastY} r={5} color={WAVE_COLOR_FAST} />

        {/* Slow wave (bottom) */}
        <Path
          path={wavePathBottom}
          color={WAVE_COLOR_SLOW}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
        />
        <Circle cx={slowX} cy={slowY} r={5} color={WAVE_COLOR_SLOW} />
      </Canvas>
      <View style={styles.labelRow}>
        <View style={[styles.labelDot, { backgroundColor: WAVE_COLOR_SLOW }]} />
        <Text style={[styles.labelText, { color: WAVE_COLOR_SLOW }]}>
          SPD=16 × MULT=8 (1 bar)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
