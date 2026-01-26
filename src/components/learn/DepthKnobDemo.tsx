import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Circle,
  Line,
  Group,
  vec,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  useDerivedValue,
  Easing,
} from 'react-native-reanimated';

interface DepthKnobDemoProps {
  width: number;
  height?: number;
}

const WAVE_COLOR = '#ff6600';
const KNOB_COLOR = '#ffffff';
const GRID_COLOR = '#333344';

export function DepthKnobDemo({ width, height = 200 }: DepthKnobDemoProps) {
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = 0;
    phase.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, [phase]);

  const padding = 12;
  const labelHeight = 24;
  const canvasHeight = height - labelHeight;
  const columnWidth = (width - padding * 3) / 2;

  // Wave area (top portion)
  const waveHeight = canvasHeight * 0.4;
  // Knob area (bottom portion)
  const knobAreaHeight = canvasHeight * 0.6;
  const knobSize = Math.min(columnWidth - padding, knobAreaHeight - padding) * 0.8;

  // Column centers
  const col1CenterX = padding + columnWidth / 2;
  const col2CenterX = width - padding - columnWidth / 2;

  // Knob positions
  const knobY = waveHeight + knobAreaHeight / 2;

  // LFO output (-1 to 1)
  const lfoOutput = useDerivedValue(() => {
    return Math.sin(phase.value * Math.PI * 2);
  }, [phase]);

  // Wave paths - full depth
  const wavePathFull = useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 50;
    const waveWidth = columnWidth - padding * 2;
    const amp = (waveHeight - padding * 2) * 0.4;
    const centerY = waveHeight / 2;
    const startX = padding + padding;

    for (let i = 0; i <= steps; i++) {
      const x = startX + (i / steps) * waveWidth;
      const y = centerY - Math.sin((i / steps) * Math.PI * 2) * amp;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    return path;
  }, [columnWidth, waveHeight, padding]);

  // Wave paths - low depth (1/3 amplitude)
  const wavePathLow = useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 50;
    const waveWidth = columnWidth - padding * 2;
    const amp = (waveHeight - padding * 2) * 0.4 * 0.33;
    const centerY = waveHeight / 2;
    const startX = width / 2 + padding;

    for (let i = 0; i <= steps; i++) {
      const x = startX + (i / steps) * waveWidth;
      const y = centerY - Math.sin((i / steps) * Math.PI * 2) * amp;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    return path;
  }, [columnWidth, waveHeight, padding, width]);

  // Center lines for waves
  const centerLineFull = useMemo(() => {
    const path = Skia.Path.Make();
    const startX = padding + padding;
    const endX = padding + columnWidth - padding;
    const centerY = waveHeight / 2;
    path.moveTo(startX, centerY);
    path.lineTo(endX, centerY);
    return path;
  }, [columnWidth, waveHeight, padding]);

  const centerLineLow = useMemo(() => {
    const path = Skia.Path.Make();
    const startX = width / 2 + padding;
    const endX = width - padding - padding;
    const centerY = waveHeight / 2;
    path.moveTo(startX, centerY);
    path.lineTo(endX, centerY);
    return path;
  }, [columnWidth, waveHeight, padding, width]);

  // Animated indicators on waves
  const indicatorFullX = useDerivedValue(() => {
    const waveWidth = columnWidth - padding * 2;
    const startX = padding + padding;
    return startX + phase.value * waveWidth;
  }, [phase, columnWidth, padding]);

  const indicatorFullY = useDerivedValue(() => {
    const amp = (waveHeight - padding * 2) * 0.4;
    const centerY = waveHeight / 2;
    return centerY - lfoOutput.value * amp;
  }, [lfoOutput, waveHeight, padding]);

  const indicatorLowX = useDerivedValue(() => {
    const waveWidth = columnWidth - padding * 2;
    const startX = width / 2 + padding;
    return startX + phase.value * waveWidth;
  }, [phase, columnWidth, padding, width]);

  const indicatorLowY = useDerivedValue(() => {
    const amp = (waveHeight - padding * 2) * 0.4 * 0.33;
    const centerY = waveHeight / 2;
    return centerY - lfoOutput.value * amp;
  }, [lfoOutput, waveHeight, padding]);

  // Knob components
  const knobLineP1Full = useDerivedValue(() => vec(col1CenterX, knobY), [col1CenterX, knobY]);
  const knobLineP2Full = useDerivedValue(() => {
    const indicatorLength = knobSize * 0.35;
    const angle = lfoOutput.value * 135 * (Math.PI / 180);
    return vec(
      col1CenterX + Math.sin(angle) * indicatorLength,
      knobY - Math.cos(angle) * indicatorLength
    );
  }, [lfoOutput, col1CenterX, knobY, knobSize]);

  const knobLineP1Low = useDerivedValue(() => vec(col2CenterX, knobY), [col2CenterX, knobY]);
  const knobLineP2Low = useDerivedValue(() => {
    const indicatorLength = knobSize * 0.35;
    const angle = lfoOutput.value * 45 * (Math.PI / 180);
    return vec(
      col2CenterX + Math.sin(angle) * indicatorLength,
      knobY - Math.cos(angle) * indicatorLength
    );
  }, [lfoOutput, col2CenterX, knobY, knobSize]);

  // Knob tick marks
  const ticksFull = useMemo(() => {
    const result = [];
    const tickCount = 11;
    const maxRotation = 135;
    const startAngle = -maxRotation * (Math.PI / 180);
    const endAngle = maxRotation * (Math.PI / 180);
    const innerRadius = knobSize * 0.42;
    const outerRadius = knobSize * 0.5;

    for (let i = 0; i < tickCount; i++) {
      const angle = startAngle + (i / (tickCount - 1)) * (endAngle - startAngle);
      result.push({
        x1: col1CenterX + Math.sin(angle) * innerRadius,
        y1: knobY - Math.cos(angle) * innerRadius,
        x2: col1CenterX + Math.sin(angle) * outerRadius,
        y2: knobY - Math.cos(angle) * outerRadius,
      });
    }
    return result;
  }, [col1CenterX, knobY, knobSize]);

  const ticksLow = useMemo(() => {
    const result = [];
    const tickCount = 11;
    const maxRotation = 45;
    const startAngle = -maxRotation * (Math.PI / 180);
    const endAngle = maxRotation * (Math.PI / 180);
    const innerRadius = knobSize * 0.42;
    const outerRadius = knobSize * 0.5;

    for (let i = 0; i < tickCount; i++) {
      const angle = startAngle + (i / (tickCount - 1)) * (endAngle - startAngle);
      result.push({
        x1: col2CenterX + Math.sin(angle) * innerRadius,
        y1: knobY - Math.cos(angle) * innerRadius,
        x2: col2CenterX + Math.sin(angle) * outerRadius,
        y2: knobY - Math.cos(angle) * outerRadius,
      });
    }
    return result;
  }, [col2CenterX, knobY, knobSize]);

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas style={{ width, height: canvasHeight }}>
        {/* Wave center lines */}
        <Path path={centerLineFull} color={GRID_COLOR} style="stroke" strokeWidth={1} />
        <Path path={centerLineLow} color={GRID_COLOR} style="stroke" strokeWidth={1} />

        {/* Wave paths */}
        <Path
          path={wavePathFull}
          color={WAVE_COLOR}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
        />
        <Path
          path={wavePathLow}
          color={WAVE_COLOR}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
        />

        {/* Wave indicators */}
        <Circle cx={indicatorFullX} cy={indicatorFullY} r={5} color={WAVE_COLOR} />
        <Circle cx={indicatorLowX} cy={indicatorLowY} r={5} color={WAVE_COLOR} />

        {/* Full depth knob */}
        <Group>
          <Circle cx={col1CenterX} cy={knobY} r={knobSize * 0.5} color={GRID_COLOR} style="stroke" strokeWidth={2} />
          {ticksFull.map((tick, i) => (
            <Line key={i} p1={{ x: tick.x1, y: tick.y1 }} p2={{ x: tick.x2, y: tick.y2 }} color={GRID_COLOR} strokeWidth={1.5} strokeCap="round" />
          ))}
          <Circle cx={col1CenterX} cy={knobY} r={knobSize * 0.38} color="#1a1a1a" />
          <Circle cx={col1CenterX} cy={knobY} r={knobSize * 0.38} color="#2a2a2a" style="stroke" strokeWidth={1} />
          <Line p1={knobLineP1Full} p2={knobLineP2Full} color={KNOB_COLOR} strokeWidth={3} strokeCap="round" />
          <Circle cx={col1CenterX} cy={knobY} r={4} color={KNOB_COLOR} />
        </Group>

        {/* Low depth knob */}
        <Group>
          <Circle cx={col2CenterX} cy={knobY} r={knobSize * 0.5} color={GRID_COLOR} style="stroke" strokeWidth={2} />
          {ticksLow.map((tick, i) => (
            <Line key={i} p1={{ x: tick.x1, y: tick.y1 }} p2={{ x: tick.x2, y: tick.y2 }} color={GRID_COLOR} strokeWidth={1.5} strokeCap="round" />
          ))}
          <Circle cx={col2CenterX} cy={knobY} r={knobSize * 0.38} color="#1a1a1a" />
          <Circle cx={col2CenterX} cy={knobY} r={knobSize * 0.38} color="#2a2a2a" style="stroke" strokeWidth={1} />
          <Line p1={knobLineP1Low} p2={knobLineP2Low} color={KNOB_COLOR} strokeWidth={3} strokeCap="round" />
          <Circle cx={col2CenterX} cy={knobY} r={4} color={KNOB_COLOR} />
        </Group>
      </Canvas>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Full depth</Text>
        <Text style={styles.label}>Low depth</Text>
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
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  label: {
    color: '#888899',
    fontSize: 13,
    fontWeight: '500',
  },
});
