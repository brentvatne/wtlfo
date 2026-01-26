import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Circle,
  LinearGradient,
  vec,
  Rect,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  useDerivedValue,
  Easing,
} from 'react-native-reanimated';

interface DepthFadeDemoProps {
  width: number;
  height?: number;
}

const WAVE_COLOR = '#ff6600';
const FADE_COLOR = '#4488ff';
const GRID_COLOR = '#333344';

export function DepthFadeDemo({ width, height = 160 }: DepthFadeDemoProps) {

  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = 0;
    phase.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, [phase]);

  const padding = 16;
  const labelHeight = 24;
  const canvasHeight = height - labelHeight;
  const waveHeight = canvasHeight - padding * 2;
  const waveWidth = width - padding * 2;
  const centerY = padding + waveHeight / 2;
  const amp = waveHeight * 0.4;

  // Grid center line
  const gridPath = React.useMemo(() => {
    const path = Skia.Path.Make();
    path.moveTo(padding, centerY);
    path.lineTo(padding + waveWidth, centerY);
    return path;
  }, [waveWidth, centerY, padding]);

  // Depth envelope path (the outer bounds showing full depth)
  const depthEnvelopePath = React.useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 60;

    // Top envelope
    for (let i = 0; i <= steps; i++) {
      const x = padding + (i / steps) * waveWidth;
      const y = centerY - amp;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }

    return path;
  }, [waveWidth, centerY, amp, padding]);

  const depthEnvelopePathBottom = React.useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 60;

    for (let i = 0; i <= steps; i++) {
      const x = padding + (i / steps) * waveWidth;
      const y = centerY + amp;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }

    return path;
  }, [waveWidth, centerY, amp, padding]);

  // Fade envelope (multiplier that grows from 0 to 1)
  const fadeEnvelopePath = React.useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 60;

    // Top fade envelope (starts at center, expands to full amp)
    for (let i = 0; i <= steps; i++) {
      const fadeProgress = Math.min(1, (i / steps) * 2); // Fade in over first half
      const x = padding + (i / steps) * waveWidth;
      const y = centerY - amp * fadeProgress;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }

    return path;
  }, [waveWidth, centerY, amp, padding]);

  const fadeEnvelopePathBottom = React.useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 60;

    for (let i = 0; i <= steps; i++) {
      const fadeProgress = Math.min(1, (i / steps) * 2);
      const x = padding + (i / steps) * waveWidth;
      const y = centerY + amp * fadeProgress;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }

    return path;
  }, [waveWidth, centerY, amp, padding]);

  // Animated wave with fade applied
  const animatedWavePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const steps = 60;
    const cycleProgress = phase.value;

    for (let i = 0; i <= steps; i++) {
      const waveProgress = i / steps;
      // Fade envelope: starts at 0, reaches full at 50% of wave
      const fadeMultiplier = Math.min(1, waveProgress * 2);
      const x = padding + waveProgress * waveWidth;
      // Multiple cycles within the display
      const wavePhase = (waveProgress * 4 + cycleProgress) * Math.PI * 2;
      const y = centerY - Math.sin(wavePhase) * amp * fadeMultiplier;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    return path;
  }, [phase, waveWidth, centerY, amp, padding]);

  // Moving indicator
  const indicatorX = useDerivedValue(() => {
    return padding + phase.value * waveWidth;
  }, [phase, waveWidth, padding]);

  const indicatorY = useDerivedValue(() => {
    const fadeMultiplier = Math.min(1, phase.value * 2);
    const wavePhase = (phase.value * 4 + phase.value) * Math.PI * 2;
    return centerY - Math.sin(wavePhase) * amp * fadeMultiplier;
  }, [phase, centerY, amp]);

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.labelRow}>
        <View style={styles.labelItem}>
          <View style={[styles.labelDot, { backgroundColor: WAVE_COLOR }]} />
          <Text style={[styles.labelText, { color: WAVE_COLOR }]}>Depth range</Text>
        </View>
        <View style={styles.labelItem}>
          <View style={[styles.labelDot, { backgroundColor: FADE_COLOR }]} />
          <Text style={[styles.labelText, { color: FADE_COLOR }]}>Fade envelope</Text>
        </View>
      </View>
      <Canvas style={{ width, height: canvasHeight }}>
        {/* Depth zone fill */}
        <Rect
          x={padding}
          y={centerY - amp}
          width={waveWidth}
          height={amp * 2}
        >
          <LinearGradient
            start={vec(padding, centerY - amp)}
            end={vec(padding, centerY + amp)}
            colors={['rgba(255,102,0,0.1)', 'rgba(255,102,0,0.02)', 'rgba(255,102,0,0.1)']}
          />
        </Rect>

        {/* Grid center line */}
        <Path
          path={gridPath}
          color={GRID_COLOR}
          style="stroke"
          strokeWidth={1}
        />

        {/* Depth envelope (dashed lines showing max range) */}
        <Path
          path={depthEnvelopePath}
          color="#553300"
          style="stroke"
          strokeWidth={1}
        />
        <Path
          path={depthEnvelopePathBottom}
          color="#553300"
          style="stroke"
          strokeWidth={1}
        />

        {/* Fade envelope lines */}
        <Path
          path={fadeEnvelopePath}
          color={FADE_COLOR}
          style="stroke"
          strokeWidth={1.5}
          opacity={0.5}
        />
        <Path
          path={fadeEnvelopePathBottom}
          color={FADE_COLOR}
          style="stroke"
          strokeWidth={1.5}
          opacity={0.5}
        />

        {/* Animated wave */}
        <Path
          path={animatedWavePath}
          color={WAVE_COLOR}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
        />

        {/* Moving indicator */}
        <Circle cx={indicatorX} cy={indicatorY} r={5} color={WAVE_COLOR} />
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  labelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
