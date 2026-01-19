import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { Canvas, Path, Skia, Circle, Line, Group } from '@shopify/react-native-skia';

export interface SkiaIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  borderRadius?: number;
  style?: ViewStyle;
}

const DEFAULT_SIZE = 40;
const DEFAULT_COLOR = '#ff6600';
const DEFAULT_STROKE_WIDTH = 1.5;

// Icon 1: Question Mark with Wave
export function QuestionWaveIcon({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  backgroundColor = '#2a2a2a',
  borderRadius = 8,
  style,
}: SkiaIconProps) {
  const padding = 6;
  const canvas = size - padding * 2;
  const centerX = size / 2;
  const centerY = size / 2;

  const path = Skia.Path.Make();

  // Question mark curve
  const qRadius = canvas * 0.28;
  const qX = centerX - canvas * 0.05;
  const qY = centerY - canvas * 0.15;

  path.moveTo(qX - qRadius, qY);
  path.quadTo(qX - qRadius, qY - qRadius, qX, qY - qRadius);
  path.quadTo(qX + qRadius, qY - qRadius, qX + qRadius, qY);
  path.quadTo(qX + qRadius, qY + qRadius * 0.4, qX, qY + qRadius * 0.5);
  path.lineTo(qX, qY + qRadius * 0.9);

  // Small wave accent
  const waveX = centerX + canvas * 0.22;
  const waveY = centerY + canvas * 0.1;
  path.moveTo(waveX, waveY - canvas * 0.2);
  path.quadTo(waveX + canvas * 0.1, waveY, waveX, waveY + canvas * 0.2);

  return (
    <View
      style={[
        { width: size, height: size, backgroundColor, borderRadius, overflow: 'hidden' },
        style,
      ]}
      accessibilityLabel="What is an LFO?"
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
        {/* Question mark dot */}
        <Circle cx={centerX - canvas * 0.05} cy={centerY + canvas * 0.35} r={strokeWidth * 0.8} color={color} />
      </Canvas>
    </View>
  );
}

// Icon 2: Seven Sliders
export function SlidersIcon({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  backgroundColor = '#2a2a2a',
  borderRadius = 8,
  style,
}: SkiaIconProps) {
  const padding = 6;
  const canvas = size - padding * 2;
  const sliderCount = 7;
  const sliderSpacing = canvas / (sliderCount + 1);
  const heights = [0.3, 0.7, 0.5, 0.9, 0.4, 0.8, 0.6];

  return (
    <View
      style={[
        { width: size, height: size, backgroundColor, borderRadius, overflow: 'hidden' },
        style,
      ]}
      accessibilityLabel="The 7 Parameters"
      accessibilityRole="image"
    >
      <Canvas style={{ width: size, height: size }}>
        <Group>
          {heights.map((h, i) => {
            const x = padding + sliderSpacing * (i + 1);
            const yTop = padding + canvas * (1 - h);
            const yBottom = padding + canvas;
            return (
              <Group key={i}>
                <Line
                  p1={{ x, y: yTop }}
                  p2={{ x, y: yBottom }}
                  color={color}
                  strokeWidth={strokeWidth}
                  strokeCap="round"
                />
                <Circle cx={x} cy={yTop} r={strokeWidth * 1.1} color={color} />
              </Group>
            );
          })}
        </Group>
      </Canvas>
    </View>
  );
}

// Icon 3: Waveforms Grid (2x2)
export function WaveformsIcon({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  backgroundColor = '#2a2a2a',
  borderRadius = 8,
  style,
}: SkiaIconProps) {
  const padding = 5;
  const gap = 4;
  const cellSize = (size - padding * 2 - gap) / 2;

  function createWaveform(
    startX: number,
    startY: number,
    width: number,
    height: number,
    type: 'sine' | 'square' | 'saw' | 'tri'
  ) {
    const path = Skia.Path.Make();
    const cy = startY + height / 2;
    const amp = height * 0.35;

    switch (type) {
      case 'sine': {
        const steps = 12;
        for (let i = 0; i <= steps; i++) {
          const x = startX + (i / steps) * width;
          const y = cy + Math.sin((i / steps) * Math.PI * 2) * amp;
          if (i === 0) path.moveTo(x, y);
          else path.lineTo(x, y);
        }
        break;
      }
      case 'square': {
        path.moveTo(startX, cy + amp);
        path.lineTo(startX + width * 0.5, cy + amp);
        path.lineTo(startX + width * 0.5, cy - amp);
        path.lineTo(startX + width, cy - amp);
        break;
      }
      case 'saw': {
        path.moveTo(startX, cy - amp);
        path.lineTo(startX + width * 0.5, cy + amp);
        path.moveTo(startX + width * 0.5, cy - amp);
        path.lineTo(startX + width, cy + amp);
        break;
      }
      case 'tri': {
        path.moveTo(startX, cy);
        path.lineTo(startX + width * 0.25, cy - amp);
        path.lineTo(startX + width * 0.75, cy + amp);
        path.lineTo(startX + width, cy);
        break;
      }
    }
    return path;
  }

  return (
    <View
      style={[
        { width: size, height: size, backgroundColor, borderRadius, overflow: 'hidden' },
        style,
      ]}
      accessibilityLabel="Waveforms"
      accessibilityRole="image"
    >
      <Canvas style={{ width: size, height: size }}>
        <Group>
          <Path path={createWaveform(padding, padding, cellSize, cellSize, 'sine')} color={color} style="stroke" strokeWidth={strokeWidth * 0.9} strokeCap="round" strokeJoin="round" />
          <Path path={createWaveform(padding + cellSize + gap, padding, cellSize, cellSize, 'square')} color={color} style="stroke" strokeWidth={strokeWidth * 0.9} strokeCap="round" strokeJoin="round" />
          <Path path={createWaveform(padding, padding + cellSize + gap, cellSize, cellSize, 'saw')} color={color} style="stroke" strokeWidth={strokeWidth * 0.9} strokeCap="round" strokeJoin="round" />
          <Path path={createWaveform(padding + cellSize + gap, padding + cellSize + gap, cellSize, cellSize, 'tri')} color={color} style="stroke" strokeWidth={strokeWidth * 0.9} strokeCap="round" strokeJoin="round" />
        </Group>
      </Canvas>
    </View>
  );
}

// Icon 4: Speedometer/Gauge
export function SpeedometerIcon({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  backgroundColor = '#2a2a2a',
  borderRadius = 8,
  style,
}: SkiaIconProps) {
  const centerX = size / 2;
  const centerY = size / 2 + 2;
  const radius = size * 0.35;

  const path = Skia.Path.Make();

  // 3/4 arc
  const startAngle = Math.PI * 0.8;
  const endAngle = Math.PI * 2.2;
  const steps = 24;

  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / steps);
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }

  // Needle pointing up-right
  const needleAngle = Math.PI * 1.3;
  const needleLength = radius * 0.65;

  return (
    <View
      style={[
        { width: size, height: size, backgroundColor, borderRadius, overflow: 'hidden' },
        style,
      ]}
      accessibilityLabel="Speed & Timing"
      accessibilityRole="image"
    >
      <Canvas style={{ width: size, height: size }}>
        <Group>
          <Path path={path} color={color} style="stroke" strokeWidth={strokeWidth} strokeCap="round" strokeJoin="round" />
          <Line
            p1={{ x: centerX, y: centerY }}
            p2={{ x: centerX + Math.cos(needleAngle) * needleLength, y: centerY + Math.sin(needleAngle) * needleLength }}
            color={color}
            strokeWidth={strokeWidth * 1.3}
            strokeCap="round"
          />
          <Circle cx={centerX} cy={centerY} r={strokeWidth * 1.2} color={color} />
        </Group>
      </Canvas>
    </View>
  );
}

// Icon 5: Envelope Curve (ADSR-like)
export function EnvelopeIcon({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  backgroundColor = '#2a2a2a',
  borderRadius = 8,
  style,
}: SkiaIconProps) {
  const padding = 7;
  const canvas = size - padding * 2;

  const path = Skia.Path.Make();

  // ADSR envelope shape
  path.moveTo(padding, padding + canvas); // Start bottom-left
  path.lineTo(padding + canvas * 0.2, padding + canvas * 0.2); // Attack
  path.lineTo(padding + canvas * 0.4, padding + canvas * 0.5); // Decay
  path.lineTo(padding + canvas * 0.7, padding + canvas * 0.5); // Sustain
  path.lineTo(padding + canvas, padding + canvas); // Release

  return (
    <View
      style={[
        { width: size, height: size, backgroundColor, borderRadius, overflow: 'hidden' },
        style,
      ]}
      accessibilityLabel="Depth & Fade"
      accessibilityRole="image"
    >
      <Canvas style={{ width: size, height: size }}>
        <Path path={path} color={color} style="stroke" strokeWidth={strokeWidth} strokeCap="round" strokeJoin="round" />
      </Canvas>
    </View>
  );
}

// Icon 6: Trigger Modes (5 mode indicators)
export function TriggersIcon({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  backgroundColor = '#2a2a2a',
  borderRadius = 8,
  style,
}: SkiaIconProps) {
  const padding = 6;
  const canvas = size - padding * 2;
  const modes = 5;
  const spacing = canvas / (modes + 1);
  // Different patterns for FRE, TRG, HLD, ONE, HLF
  const patterns = [
    { filled: true, y: 0.5 },   // FRE - continuous
    { filled: true, y: 0.3 },   // TRG - trigger
    { filled: true, y: 0.7 },   // HLD - hold
    { filled: false, y: 0.4 },  // ONE - one-shot (outlined)
    { filled: false, y: 0.6 },  // HLF - half (outlined)
  ];

  return (
    <View
      style={[
        { width: size, height: size, backgroundColor, borderRadius, overflow: 'hidden' },
        style,
      ]}
      accessibilityLabel="Trigger Modes"
      accessibilityRole="image"
    >
      <Canvas style={{ width: size, height: size }}>
        <Group>
          {patterns.map((p, i) => {
            const x = padding + spacing * (i + 1);
            const y = padding + canvas * p.y;
            const r = strokeWidth * 1.3;
            return p.filled ? (
              <Circle key={i} cx={x} cy={y} r={r} color={color} />
            ) : (
              <Circle key={i} cx={x} cy={y} r={r} color={color} style="stroke" strokeWidth={strokeWidth * 0.8} />
            );
          })}
        </Group>
      </Canvas>
    </View>
  );
}

// Icon 7: Destinations (routing arrow)
export function DestinationsIcon({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  backgroundColor = '#2a2a2a',
  borderRadius = 8,
  style,
}: SkiaIconProps) {
  const padding = 6;
  const canvas = size - padding * 2;
  const radius = canvas * 0.18;
  const leftX = padding + canvas * 0.22;
  const rightX = padding + canvas * 0.78;
  const centerY = size / 2;

  const arrowPath = Skia.Path.Make();
  arrowPath.moveTo(leftX + radius + 2, centerY);
  arrowPath.lineTo(rightX - radius - 2, centerY);

  // Arrow head
  const headSize = strokeWidth * 2.5;
  arrowPath.moveTo(rightX - radius - headSize - 2, centerY - headSize * 0.6);
  arrowPath.lineTo(rightX - radius - 2, centerY);
  arrowPath.lineTo(rightX - radius - headSize - 2, centerY + headSize * 0.6);

  return (
    <View
      style={[
        { width: size, height: size, backgroundColor, borderRadius, overflow: 'hidden' },
        style,
      ]}
      accessibilityLabel="Destinations"
      accessibilityRole="image"
    >
      <Canvas style={{ width: size, height: size }}>
        <Group>
          <Circle cx={leftX} cy={centerY} r={radius} color={color} style="stroke" strokeWidth={strokeWidth} />
          <Circle cx={rightX} cy={centerY} r={radius} color={color} style="stroke" strokeWidth={strokeWidth} />
          <Path path={arrowPath} color={color} style="stroke" strokeWidth={strokeWidth} strokeCap="round" strokeJoin="round" />
        </Group>
      </Canvas>
    </View>
  );
}

// Icon 8: Timing Math (fraction)
export function TimingMathIcon({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  backgroundColor = '#2a2a2a',
  borderRadius = 8,
  style,
}: SkiaIconProps) {
  const padding = 8;
  const canvas = size - padding * 2;
  const centerX = size / 2;

  const path = Skia.Path.Make();
  // Diagonal fraction bar
  path.moveTo(padding + canvas * 0.2, padding + canvas * 0.7);
  path.lineTo(padding + canvas * 0.8, padding + canvas * 0.3);

  return (
    <View
      style={[
        { width: size, height: size, backgroundColor, borderRadius, overflow: 'hidden' },
        style,
      ]}
      accessibilityLabel="Timing Math"
      accessibilityRole="image"
    >
      <Canvas style={{ width: size, height: size }}>
        <Group>
          <Path path={path} color={color} style="stroke" strokeWidth={strokeWidth} strokeCap="round" />
          {/* Numerator */}
          <Circle cx={centerX - canvas * 0.12} cy={padding + canvas * 0.22} r={strokeWidth * 1.1} color={color} />
          {/* Denominator */}
          <Circle cx={centerX + canvas * 0.12} cy={padding + canvas * 0.78} r={strokeWidth * 1.1} color={color} />
        </Group>
      </Canvas>
    </View>
  );
}

// Icon 9: Preset Recipes (star)
export function PresetsIcon({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  backgroundColor = '#2a2a2a',
  borderRadius = 8,
  style,
}: SkiaIconProps) {
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.32;
  const innerRadius = outerRadius * 0.4;

  const path = Skia.Path.Make();

  // 5-pointed star
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.close();

  return (
    <View
      style={[
        { width: size, height: size, backgroundColor, borderRadius, overflow: 'hidden' },
        style,
      ]}
      accessibilityLabel="Preset Recipes"
      accessibilityRole="image"
    >
      <Canvas style={{ width: size, height: size }}>
        <Path path={path} color={color} style="stroke" strokeWidth={strokeWidth} strokeCap="round" strokeJoin="round" />
      </Canvas>
    </View>
  );
}
