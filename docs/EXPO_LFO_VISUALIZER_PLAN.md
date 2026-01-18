# Expo LFO Visualizer Component Plan

This document outlines the design for a modular, reusable LFO visualization component built with Expo and `@shopify/react-native-skia`. The component is designed to be **completely independent** of any specific LFO engine implementation—it accepts all data via props and can be driven by the `elektron-lfo` library or simple mock data.

## Design Philosophy

- **Decoupled**: No dependency on the LFO engine; accepts raw values via props
- **Performant**: Uses Skia's GPU-accelerated rendering with Reanimated for 60fps animations
- **Modular**: Separate components for different visualization aspects
- **Configurable**: Extensive styling and behavior options via props

---

## Dependencies

```json
{
  "dependencies": {
    "@shopify/react-native-skia": "^1.x",
    "react-native-reanimated": "^3.x"
  }
}
```

---

## Component Architecture

```
src/components/lfo/
├── LFOVisualizer.tsx        # Main container component
├── WaveformDisplay.tsx      # Static waveform shape rendering
├── PhaseIndicator.tsx       # Animated phase position marker
├── OutputValueDisplay.tsx   # Numeric output value display
├── TimingInfo.tsx           # Cycle time and note value display
├── ParameterBadges.tsx      # Shows current LFO settings
├── types.ts                 # TypeScript interfaces
├── constants.ts             # Color schemes, dimensions
├── hooks/
│   ├── useWaveformPath.ts   # Generates path for waveform
│   └── useAnimatedPhase.ts  # Handles phase animation
└── index.ts                 # Public exports
```

---

## Core Types (`types.ts`)

```typescript
import type { SharedValue } from 'react-native-reanimated';

// Waveform types matching Digitakt II
export type WaveformType = 'TRI' | 'SIN' | 'SQR' | 'SAW' | 'EXP' | 'RMP' | 'RND';

// Trigger modes matching Digitakt II
export type TriggerMode = 'FRE' | 'TRG' | 'HLD' | 'ONE' | 'HLF';

/**
 * Props for driving the visualizer - can come from LFO engine or mock data
 */
export interface LFOVisualizerProps {
  // === REQUIRED: Current LFO State ===

  /** Current phase position (0.0 to 1.0) - can be animated SharedValue or static number */
  phase: number | SharedValue<number>;

  /** Current output value (-1.0 to 1.0 for bipolar, 0.0 to 1.0 for unipolar) */
  output: number | SharedValue<number>;

  // === REQUIRED: LFO Configuration ===

  /** Waveform type to display */
  waveform: WaveformType;

  // === OPTIONAL: Display Parameters ===

  /** Speed value for display (-64 to +63) */
  speed?: number;

  /** Multiplier value for display */
  multiplier?: number | string;

  /** Start phase for display (0-127) */
  startPhase?: number;

  /** Trigger mode for display */
  mode?: TriggerMode;

  /** Depth value for display (-64 to +63) */
  depth?: number;

  /** Fade value for display (-64 to +63) */
  fade?: number;

  // === OPTIONAL: Timing Info ===

  /** BPM for timing calculations display */
  bpm?: number;

  /** Calculated cycle time in milliseconds */
  cycleTimeMs?: number;

  /** Musical note value string (e.g., "1/4", "1 bar", "16 bars") */
  noteValue?: string;

  // === OPTIONAL: Styling ===

  /** Width of the visualizer */
  width?: number;

  /** Height of the visualizer */
  height?: number;

  /** Color theme */
  theme?: 'dark' | 'light' | LFOTheme;

  /** Show parameter badges */
  showParameters?: boolean;

  /** Show timing info */
  showTiming?: boolean;

  /** Show numeric output value */
  showOutput?: boolean;

  /** Waveform line thickness */
  strokeWidth?: number;
}

export interface LFOTheme {
  background: string;
  waveformStroke: string;
  waveformFill?: string;
  phaseIndicator: string;
  gridLines: string;
  text: string;
  textSecondary: string;
  positive: string;
  negative: string;
  accent: string;
}

/**
 * Props for the standalone waveform display
 */
export interface WaveformDisplayProps {
  waveform: WaveformType;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  /** Number of points to sample for path generation */
  resolution?: number;
}

/**
 * Props for the phase indicator overlay
 */
export interface PhaseIndicatorProps {
  phase: number | SharedValue<number>;
  width: number;
  height: number;
  color: string;
  /** Show the output value at the phase position */
  showDot?: boolean;
  dotRadius?: number;
}
```

---

## Main Component (`LFOVisualizer.tsx`)

```typescript
import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { WaveformDisplay } from './WaveformDisplay';
import { PhaseIndicator } from './PhaseIndicator';
import { OutputValueDisplay } from './OutputValueDisplay';
import { TimingInfo } from './TimingInfo';
import { ParameterBadges } from './ParameterBadges';
import { DEFAULT_THEME_DARK, DEFAULT_THEME_LIGHT } from './constants';
import type { LFOVisualizerProps, LFOTheme } from './types';

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 150;
const PADDING = 16;

export function LFOVisualizer({
  phase,
  output,
  waveform,
  speed,
  multiplier,
  startPhase,
  mode,
  depth,
  fade,
  bpm,
  cycleTimeMs,
  noteValue,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  theme = 'dark',
  showParameters = true,
  showTiming = true,
  showOutput = true,
  strokeWidth = 2,
}: LFOVisualizerProps) {
  // Resolve theme
  const resolvedTheme: LFOTheme = useMemo(() => {
    if (typeof theme === 'object') return theme;
    return theme === 'dark' ? DEFAULT_THEME_DARK : DEFAULT_THEME_LIGHT;
  }, [theme]);

  // IMPORTANT: Always call hooks unconditionally to satisfy Rules of Hooks
  // Create internal shared values that we'll sync with props
  const internalPhase = useSharedValue(typeof phase === 'number' ? phase : 0);
  const internalOutput = useSharedValue(typeof output === 'number' ? output : 0);

  // Determine which values to use (prop SharedValue or internal)
  const isPhaseShared = typeof phase !== 'number';
  const isOutputShared = typeof output !== 'number';

  // Sync internal values when static props change
  React.useEffect(() => {
    if (!isPhaseShared) {
      internalPhase.value = phase as number;
    }
  }, [phase, isPhaseShared]);

  React.useEffect(() => {
    if (!isOutputShared) {
      internalOutput.value = output as number;
    }
  }, [output, isOutputShared]);

  // Use the appropriate shared value (from props or internal)
  const phaseValue = isPhaseShared ? (phase as SharedValue<number>) : internalPhase;
  const outputValue = isOutputShared ? (output as SharedValue<number>) : internalOutput;

  // Canvas dimensions (excluding padding for info displays)
  const canvasWidth = width;
  const canvasHeight = height - (showTiming ? 30 : 0) - (showParameters ? 40 : 0);

  return (
    <View style={[styles.container, { width, backgroundColor: resolvedTheme.background }]}>
      {/* Parameter badges at top */}
      {showParameters && (
        <ParameterBadges
          waveform={waveform}
          speed={speed}
          multiplier={multiplier}
          mode={mode}
          depth={depth}
          fade={fade}
          startPhase={startPhase}
          theme={resolvedTheme}
        />
      )}

      {/* Main waveform canvas */}
      <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
        <Group>
          {/* Grid lines (optional background) */}
          <GridLines
            width={canvasWidth}
            height={canvasHeight}
            color={resolvedTheme.gridLines}
          />

          {/* Static waveform shape */}
          <WaveformDisplay
            waveform={waveform}
            width={canvasWidth}
            height={canvasHeight}
            strokeColor={resolvedTheme.waveformStroke}
            strokeWidth={strokeWidth}
            resolution={128}
          />

          {/* Animated phase indicator */}
          <PhaseIndicator
            phase={phaseValue}
            output={outputValue}
            width={canvasWidth}
            height={canvasHeight}
            color={resolvedTheme.phaseIndicator}
            showDot={true}
            dotRadius={6}
            waveform={waveform} // Required for correct Y-positioning on unipolar waveforms
          />
        </Group>
      </Canvas>

      {/* Output value display */}
      {showOutput && (
        <OutputValueDisplay
          output={outputValue}
          theme={resolvedTheme}
        />
      )}

      {/* Timing info at bottom */}
      {showTiming && (
        <TimingInfo
          bpm={bpm}
          cycleTimeMs={cycleTimeMs}
          noteValue={noteValue}
          theme={resolvedTheme}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});
```

---

## Waveform Path Generation (`hooks/useWaveformPath.ts`)

```typescript
import { useMemo } from 'react';
import { Skia, SkPath } from '@shopify/react-native-skia';
import type { WaveformType } from '../types';

/**
 * Generates waveform sample based on Digitakt II specifications
 */
function sampleWaveform(waveform: WaveformType, phase: number): number {
  switch (waveform) {
    case 'TRI': // Triangle - Bipolar
      if (phase < 0.25) return phase * 4;
      if (phase < 0.75) return 1 - (phase - 0.25) * 4;
      return -1 + (phase - 0.75) * 4;

    case 'SIN': // Sine - Bipolar
      return Math.sin(phase * 2 * Math.PI);

    case 'SQR': // Square - Bipolar
      return phase < 0.5 ? 1 : -1;

    case 'SAW': // Sawtooth - Bipolar (rising)
      return phase * 2 - 1;

    case 'EXP': // Exponential - Unipolar (0 to 1)
      const k = 4;
      return (Math.exp(phase * k) - 1) / (Math.exp(k) - 1);

    case 'RMP': // Ramp - Unipolar (1 to 0, falling)
      return 1 - phase;

    case 'RND': // Random - show as noise pattern for static display
      // For static display, show a representative S&H pattern
      const steps = 8;
      const step = Math.floor(phase * steps);
      // Use deterministic "random" for consistent display
      return Math.sin(step * 12.9898) * 0.8;

    default:
      return 0;
  }
}

/**
 * Determines if waveform is unipolar (0 to 1) vs bipolar (-1 to 1)
 */
function isUnipolar(waveform: WaveformType): boolean {
  return waveform === 'EXP' || waveform === 'RMP';
}

/**
 * Hook to generate a Skia Path for the waveform
 */
export function useWaveformPath(
  waveform: WaveformType,
  width: number,
  height: number,
  resolution: number = 128,
  padding: number = 8
): SkPath {
  return useMemo(() => {
    const path = Skia.Path.Make();
    const unipolar = isUnipolar(waveform);

    // Calculate drawable area
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    // Center Y for bipolar, bottom for unipolar
    const centerY = unipolar
      ? height - padding  // Unipolar: 0 at bottom
      : height / 2;       // Bipolar: 0 at center

    // Scale factor for Y
    const scaleY = unipolar
      ? -drawHeight        // Unipolar: full height upward
      : -drawHeight / 2;   // Bipolar: half height each direction

    for (let i = 0; i <= resolution; i++) {
      const phase = i / resolution;
      const value = sampleWaveform(waveform, phase);

      const x = padding + phase * drawWidth;
      const y = centerY + value * scaleY;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    return path;
  }, [waveform, width, height, resolution, padding]);
}
```

---

## Waveform Display Component (`WaveformDisplay.tsx`)

```typescript
import React from 'react';
import { Path, Paint } from '@shopify/react-native-skia';
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
}: WaveformDisplayProps) {
  const path = useWaveformPath(waveform, width, height, resolution);

  return (
    <>
      {/* Optional fill */}
      {fillColor && (
        <Path path={path} color={fillColor} style="fill" opacity={0.2} />
      )}

      {/* Stroke */}
      <Path path={path} color={strokeColor} style="stroke" strokeWidth={strokeWidth}>
        <Paint style="stroke" strokeCap="round" strokeJoin="round" />
      </Path>
    </>
  );
}
```

---

## Phase Indicator (`PhaseIndicator.tsx`)

```typescript
import React from 'react';
import { Line, Circle, Group } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { PhaseIndicatorProps, WaveformType } from './types';

interface ExtendedPhaseIndicatorProps extends PhaseIndicatorProps {
  output: SharedValue<number>;
  waveform?: WaveformType;
}

export function PhaseIndicator({
  phase,
  output,
  width,
  height,
  color,
  showDot = true,
  dotRadius = 6,
  waveform,
}: ExtendedPhaseIndicatorProps) {
  const padding = 8;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  // Determine if unipolar for Y calculation
  const isUnipolar = waveform === 'EXP' || waveform === 'RMP';
  const centerY = isUnipolar ? height - padding : height / 2;
  const scaleY = isUnipolar ? -drawHeight : -drawHeight / 2;

  // Animated X position based on phase
  const xPosition = useDerivedValue(() => {
    'worklet';
    const phaseVal = typeof phase === 'number' ? phase : phase.value;
    return padding + phaseVal * drawWidth;
  }, [phase]);

  // Animated Y position based on output value
  const yPosition = useDerivedValue(() => {
    'worklet';
    return centerY + output.value * scaleY;
  }, [output]);

  return (
    <Group>
      {/* Vertical line showing current phase position */}
      <Line
        p1={useDerivedValue(() => ({ x: xPosition.value, y: padding }), [xPosition])}
        p2={useDerivedValue(() => ({ x: xPosition.value, y: height - padding }), [xPosition])}
        color={color}
        style="stroke"
        strokeWidth={1}
        opacity={0.5}
      />

      {/* Dot at current output value */}
      {showDot && (
        <Circle
          cx={xPosition}
          cy={yPosition}
          r={dotRadius}
          color={color}
        />
      )}
    </Group>
  );
}
```

---

## Output Value Display (`OutputValueDisplay.tsx`)

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Text as SkiaText, useFont } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { LFOTheme } from './types';

interface OutputValueDisplayProps {
  output: SharedValue<number>;
  theme: LFOTheme;
}

export function OutputValueDisplay({ output, theme }: OutputValueDisplayProps) {
  // Format output value with 2 decimal places
  const displayText = useDerivedValue(() => {
    'worklet';
    const val = output.value;
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}`;
  }, [output]);

  // Determine color based on positive/negative
  const textColor = useDerivedValue(() => {
    'worklet';
    return output.value >= 0 ? theme.positive : theme.negative;
  }, [output, theme]);

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <SkiaText
          x={8}
          y={20}
          text={displayText}
          color={textColor}
          font={useFont(require('./fonts/JetBrainsMono-Bold.ttf'), 16)}
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 28,
    paddingHorizontal: 8,
  },
  canvas: {
    flex: 1,
  },
});
```

---

## Grid Lines Component (`GridLines.tsx`)

```typescript
import React from 'react';
import { Group, Line } from '@shopify/react-native-skia';

interface GridLinesProps {
  width: number;
  height: number;
  color: string;
  /** Number of vertical divisions */
  verticalDivisions?: number;
  /** Number of horizontal divisions */
  horizontalDivisions?: number;
}

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
    <Group opacity={0.3}>
      {verticalLines}
      {horizontalLines}
      {/* Emphasized zero line */}
      <Line
        p1={{ x: padding, y: centerY }}
        p2={{ x: width - padding, y: centerY }}
        color={color}
        style="stroke"
        strokeWidth={1.5}
      />
    </Group>
  );
}
```

---

## Parameter Badges (`ParameterBadges.tsx`)

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WaveformType, TriggerMode, LFOTheme } from './types';

interface ParameterBadgesProps {
  waveform: WaveformType;
  speed?: number;
  multiplier?: number | string;
  mode?: TriggerMode;
  depth?: number;
  fade?: number;
  startPhase?: number;
  theme: LFOTheme;
}

export function ParameterBadges({
  waveform,
  speed,
  multiplier,
  mode,
  depth,
  fade,
  startPhase,
  theme,
}: ParameterBadgesProps) {
  const badges = [
    { label: 'WAVE', value: waveform },
    speed !== undefined && { label: 'SPD', value: speed.toFixed(2) },
    multiplier !== undefined && { label: 'MULT', value: String(multiplier) },
    mode && { label: 'MODE', value: mode },
    depth !== undefined && { label: 'DEP', value: depth.toFixed(2) },
    fade !== undefined && { label: 'FADE', value: fade.toString() },
    startPhase !== undefined && { label: 'SPH', value: startPhase.toString() },
  ].filter(Boolean);

  return (
    <View style={styles.container}>
      {badges.map((badge, index) => (
        <View key={index} style={[styles.badge, { backgroundColor: theme.accent + '30' }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {badge.label}
          </Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {badge.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
```

---

## Timing Info (`TimingInfo.tsx`)

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LFOTheme } from './types';

interface TimingInfoProps {
  bpm?: number;
  cycleTimeMs?: number;
  noteValue?: string;
  theme: LFOTheme;
}

export function TimingInfo({ bpm, cycleTimeMs, noteValue, theme }: TimingInfoProps) {
  return (
    <View style={styles.container}>
      {bpm !== undefined && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: theme.text }]}>{bpm}</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>BPM</Text>
        </View>
      )}

      {cycleTimeMs !== undefined && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: theme.text }]}>
            {cycleTimeMs >= 1000
              ? `${(cycleTimeMs / 1000).toFixed(2)}s`
              : `${cycleTimeMs.toFixed(0)}ms`}
          </Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>CYCLE</Text>
        </View>
      )}

      {noteValue && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: theme.accent }]}>{noteValue}</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>NOTE</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  item: {
    alignItems: 'center',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
```

---

## Theme Constants (`constants.ts`)

```typescript
import type { LFOTheme } from './types';

export const DEFAULT_THEME_DARK: LFOTheme = {
  background: '#1a1a2e',
  waveformStroke: '#00d4ff',
  waveformFill: '#00d4ff',
  phaseIndicator: '#ff6b6b',
  gridLines: '#ffffff',
  text: '#ffffff',
  textSecondary: '#888899',
  positive: '#4ade80',
  negative: '#f87171',
  accent: '#00d4ff',
};

export const DEFAULT_THEME_LIGHT: LFOTheme = {
  background: '#f5f5f7',
  waveformStroke: '#0066cc',
  waveformFill: '#0066cc',
  phaseIndicator: '#dc2626',
  gridLines: '#000000',
  text: '#1a1a1a',
  textSecondary: '#666677',
  positive: '#16a34a',
  negative: '#dc2626',
  accent: '#0066cc',
};

// Elektron-inspired theme
export const ELEKTRON_THEME: LFOTheme = {
  background: '#000000',
  waveformStroke: '#ff6600',
  waveformFill: '#ff6600',
  phaseIndicator: '#ffffff',
  gridLines: '#333333',
  text: '#ffffff',
  textSecondary: '#888888',
  positive: '#00ff00',
  negative: '#ff0000',
  accent: '#ff6600',
};
```

---

## Usage Examples

### Basic Usage with Static Values (Mock Data)

```typescript
import { LFOVisualizer } from '@/components/lfo';

function MockLFODemo() {
  return (
    <LFOVisualizer
      // Static values - no animation
      phase={0.25}
      output={0.5}
      waveform="SIN"

      // Display parameters
      speed={16}
      multiplier={8}
      mode="FRE"
      depth={48}
      fade={0}
      startPhase={0}

      // Timing
      bpm={120}
      cycleTimeMs={2000}
      noteValue="1 bar"

      // Styling
      width={350}
      height={200}
      theme="dark"
    />
  );
}
```

### Animated Usage with LFO Engine

```typescript
import { LFOVisualizer } from '@/components/lfo';
import { useSharedValue, useFrameCallback } from 'react-native-reanimated';
import { useLFOEngine } from 'elektron-lfo'; // Your LFO engine library

function AnimatedLFODemo() {
  const phase = useSharedValue(0);
  const output = useSharedValue(0);

  // Option 1: Use the LFO engine library
  const lfo = useLFOEngine({
    waveform: 'SIN',
    speed: 16,
    multiplier: 8,
    mode: 'FRE',
    depth: 48,
    fade: 0,
    startPhase: 0,
    bpm: 120,
  });

  // Sync shared values with engine
  useFrameCallback((frameInfo) => {
    phase.value = lfo.phase;
    output.value = lfo.output;
  });

  return (
    <LFOVisualizer
      phase={phase}
      output={output}
      waveform="SIN"
      speed={16}
      multiplier={8}
      mode="FRE"
      depth={48}
      bpm={120}
      cycleTimeMs={lfo.cycleTimeMs}
      noteValue={lfo.noteValue}
    />
  );
}
```

### Manual Animation (No Engine)

```typescript
import { LFOVisualizer } from '@/components/lfo';
import { useSharedValue, withRepeat, withTiming, useDerivedValue } from 'react-native-reanimated';
import { useEffect } from 'react';

function ManualAnimationDemo() {
  const phase = useSharedValue(0);

  // Animate phase from 0 to 1 over 2 seconds, repeating
  useEffect(() => {
    phase.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1, // infinite
      false // don't reverse
    );
  }, []);

  // Calculate sine output from phase
  const output = useDerivedValue(() => {
    'worklet';
    return Math.sin(phase.value * 2 * Math.PI);
  }, [phase]);

  return (
    <LFOVisualizer
      phase={phase}
      output={output}
      waveform="SIN"
      bpm={120}
      cycleTimeMs={2000}
      noteValue="1 bar"
    />
  );
}
```

---

## Integration with elektron-lfo Library

The `elektron-lfo` TypeScript library should export a React hook for easy integration:

```typescript
// In elektron-lfo library: src/react/useLFOEngine.ts
import { useSharedValue, useFrameCallback } from 'react-native-reanimated';
import { LFOEngine } from '../engine/LFOEngine';
import type { LFOConfig } from '../types';

export function useLFOEngine(config: LFOConfig & { bpm: number }) {
  const engine = useRef(new LFOEngine(config)).current;
  const phase = useSharedValue(0);
  const output = useSharedValue(0);

  useFrameCallback((frameInfo) => {
    'worklet';
    const deltaMs = frameInfo.timeSincePreviousFrame ?? 16;
    engine.update(deltaMs);
    phase.value = engine.state.phase;
    output.value = engine.state.output;
  });

  return {
    phase,
    output,
    cycleTimeMs: engine.cycleTimeMs,
    noteValue: engine.noteValue,
    trigger: () => engine.trigger(),
  };
}
```

---

## Performance Considerations

1. **Use SharedValues**: All animated values should be Reanimated SharedValues to run on UI thread
2. **Worklet directive**: Mark derived value callbacks with `'worklet'` for UI thread execution
3. **Memoize paths**: Waveform paths are memoized and only regenerate when waveform type changes
4. **Limit resolution**: Default 128 points is sufficient; higher values have diminishing returns
5. **Avoid re-renders**: Static config props shouldn't cause Canvas re-renders

---

## References

- [React Native Skia Documentation](https://shopify.github.io/react-native-skia/)
- [Skia Path Component](https://shopify.github.io/react-native-skia/docs/shapes/path/)
- [Skia Animations](https://shopify.github.io/react-native-skia/docs/animations/animations/)
- [Skia Animation Hooks](https://shopify.github.io/react-native-skia/docs/animations/hooks/)
- [Canvas Overview](https://shopify.github.io/react-native-skia/docs/canvas/overview/)
- [Reanimated Documentation](https://docs.swmansion.com/react-native-reanimated/)
