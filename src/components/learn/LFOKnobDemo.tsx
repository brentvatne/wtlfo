import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Circle,
  Line,
  Group,
  vec,
} from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, useDerivedValue, Easing } from 'react-native-reanimated';

interface LFOKnobDemoProps {
  width: number;
  height?: number;
}

const ACCENT_COLOR = '#ff6600';
const WAVE_COLOR = '#ff6600';
const KNOB_COLOR = '#ffffff';
const GRID_COLOR = '#333344';
const INDICATOR_COLOR = '#ff6600';

export function LFOKnobDemo({ width, height = 160 }: LFOKnobDemoProps) {
  // Animation phase (0 to 1, repeating)
  const phase = useSharedValue(0);

  useEffect(() => {
    // Animate phase from 0 to 1 over 2 seconds, repeating
    phase.value = 0;
    phase.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1, // infinite
      false // don't reverse
    );
  }, [phase]);

  // Layout calculations
  const padding = 16;
  const waveWidth = width * 0.6;
  const knobAreaWidth = width * 0.4;
  const waveHeight = height - padding * 2;
  const knobSize = Math.min(knobAreaWidth - padding * 2, waveHeight) * 0.7;
  const knobCenterX = waveWidth + knobAreaWidth / 2;
  const knobCenterY = height / 2;

  // Derive LFO output from phase (sine wave)
  const lfoOutput = useDerivedValue(() => {
    return Math.sin(phase.value * Math.PI * 2);
  }, [phase]);

  // Knob rotation based on LFO output (-135 to +135 degrees)
  const knobRotation = useDerivedValue(() => {
    return lfoOutput.value * 135 * (Math.PI / 180);
  }, [lfoOutput]);

  // Create static wave path (one full cycle)
  const wavePath = React.useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 60;
    const amp = waveHeight * 0.35;
    const centerY = height / 2;

    for (let i = 0; i <= steps; i++) {
      const x = padding + (i / steps) * (waveWidth - padding * 2);
      const y = centerY - Math.sin((i / steps) * Math.PI * 2) * amp;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    return path;
  }, [waveWidth, waveHeight, height, padding]);

  // Grid lines for wave area
  const gridPath = React.useMemo(() => {
    const path = Skia.Path.Make();
    const centerY = height / 2;
    // Center line
    path.moveTo(padding, centerY);
    path.lineTo(waveWidth - padding, centerY);
    return path;
  }, [waveWidth, height, padding]);

  // Phase indicator position (moving dot on the wave)
  const indicatorX = useDerivedValue(() => {
    return padding + phase.value * (waveWidth - padding * 2);
  }, [phase, waveWidth, padding]);

  const indicatorY = useDerivedValue(() => {
    const centerY = height / 2;
    const amp = waveHeight * 0.35;
    return centerY - lfoOutput.value * amp;
  }, [lfoOutput, height, waveHeight]);

  // Knob indicator line points
  const knobLineP1 = useDerivedValue(() => {
    return vec(knobCenterX, knobCenterY);
  }, [knobCenterX, knobCenterY]);

  const knobLineP2 = useDerivedValue(() => {
    const indicatorLength = knobSize * 0.35;
    const x = knobCenterX + Math.sin(knobRotation.value) * indicatorLength;
    const y = knobCenterY - Math.cos(knobRotation.value) * indicatorLength;
    return vec(x, y);
  }, [knobRotation, knobCenterX, knobCenterY, knobSize]);

  // Knob tick marks
  const knobTicks = React.useMemo(() => {
    const ticks = [];
    const tickCount = 11;
    const startAngle = -135 * (Math.PI / 180);
    const endAngle = 135 * (Math.PI / 180);
    const innerRadius = knobSize * 0.42;
    const outerRadius = knobSize * 0.5;

    for (let i = 0; i < tickCount; i++) {
      const angle = startAngle + (i / (tickCount - 1)) * (endAngle - startAngle);
      ticks.push({
        x1: knobCenterX + Math.sin(angle) * innerRadius,
        y1: knobCenterY - Math.cos(angle) * innerRadius,
        x2: knobCenterX + Math.sin(angle) * outerRadius,
        y2: knobCenterY - Math.cos(angle) * outerRadius,
      });
    }
    return ticks;
  }, [knobCenterX, knobCenterY, knobSize]);

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas style={{ width, height }}>
        {/* Grid center line */}
        <Path
          path={gridPath}
          color={GRID_COLOR}
          style="stroke"
          strokeWidth={1}
          strokeCap="round"
        />

        {/* Wave path */}
        <Path
          path={wavePath}
          color={WAVE_COLOR}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
        />

        {/* Phase indicator dot on wave */}
        <Circle
          cx={indicatorX}
          cy={indicatorY}
          r={6}
          color={INDICATOR_COLOR}
        />

        {/* Knob outer ring */}
        <Circle
          cx={knobCenterX}
          cy={knobCenterY}
          r={knobSize * 0.5}
          color={GRID_COLOR}
          style="stroke"
          strokeWidth={2}
        />

        {/* Knob tick marks */}
        <Group>
          {knobTicks.map((tick, i) => (
            <Line
              key={i}
              p1={{ x: tick.x1, y: tick.y1 }}
              p2={{ x: tick.x2, y: tick.y2 }}
              color={GRID_COLOR}
              strokeWidth={1.5}
              strokeCap="round"
            />
          ))}
        </Group>

        {/* Knob inner circle */}
        <Circle
          cx={knobCenterX}
          cy={knobCenterY}
          r={knobSize * 0.38}
          color="#1a1a1a"
        />
        <Circle
          cx={knobCenterX}
          cy={knobCenterY}
          r={knobSize * 0.38}
          color="#2a2a2a"
          style="stroke"
          strokeWidth={1}
        />

        {/* Knob indicator line */}
        <Line
          p1={knobLineP1}
          p2={knobLineP2}
          color={KNOB_COLOR}
          strokeWidth={3}
          strokeCap="round"
        />

        {/* Knob center dot */}
        <Circle
          cx={knobCenterX}
          cy={knobCenterY}
          r={4}
          color={KNOB_COLOR}
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
